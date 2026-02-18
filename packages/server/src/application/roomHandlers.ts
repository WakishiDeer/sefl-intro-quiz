/**
 * roomHandlers.ts — Room Context の Socket.IO イベントハンドラ
 *
 * room:create, room:join, room:leave, room:close, profile:submit を処理する。
 * ハンドラは薄く保ち、ドメインロジックは RoomAggregate に委譲する。
 */

import type { Server, Socket } from "socket.io";
import {
    C2S_EVENTS,
    S2C_EVENTS,
    CreateRoomSchema,
    JoinRoomSchema,
    SubmitProfileSchema,
    HOST_RECONNECT_GRACE_MS,
} from "@self-intro-quiz/shared";
import type {
    RoomStateSync,
    ParticipantInfo,
    RoomCreatedPayload,
    RoomJoinedPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    HostChangedPayload,
    ProfileUpdatedPayload,
    RoomErrorPayload,
    Participant,
} from "@self-intro-quiz/shared";
import { RoomAggregate, RoomDomainError } from "../domain/room/RoomAggregate.js";
import type { RoomRepository } from "../domain/room/RoomRepository.js";
import type { QuizRepository } from "../domain/quiz/QuizRepository.js";
import { QuizAggregate } from "../domain/quiz/QuizAggregate.js";
import { NodeTimerService } from "../infrastructure/NodeTimerService.js";
import { generateRoomCode } from "../utils/roomCode.js";
import { sanitize, sanitizeProfile } from "../utils/sanitize.js";
import { logger } from "../utils/logger.js";

// ============================================================
// socketId → { roomCode, participantId } のマッピング
// ============================================================

/** Socket ごとのセッション情報 */
interface SocketSession {
    roomCode: string;
    participantId: string;
}

const socketSessions = new Map<string, SocketSession>();

// ============================================================
// Helper: RoomStateSync 構築
// ============================================================

function buildRoomStateSync(
    roomAgg: RoomAggregate,
    quizRepo: QuizRepository,
    participant: Participant,
): RoomStateSync {
    const room = roomAgg.toRoom();
    const participants: ParticipantInfo[] = [];

    // スコア計算のために Quiz を取得
    const quiz = quizRepo.findByRoomCode(room.code);
    const quizAgg = quiz ? QuizAggregate.fromQuiz(quiz) : null;

    for (const p of room.participants.values()) {
        let score = 0;
        let answeredCount = 0;
        let totalQuestions = 0;

        if (quizAgg) {
            const scoreboard = quizAgg.computeScoreboard(room.participants);
            const entry = scoreboard.find((s) => s.nickname === p.nickname);
            if (entry) {
                score = entry.score;
                answeredCount = entry.answeredCount;
                totalQuestions = entry.totalQuestions;
            }
        }

        participants.push({
            nickname: p.nickname,
            score,
            answeredCount,
            totalQuestions,
            isHost: p.isHost,
            isConnected: p.isConnected,
            hasProfile: p.profile !== null,
        });
    }

    const sync: RoomStateSync = {
        room: {
            code: room.code,
            phase: room.phase,
            currentQuestionIndex: quizAgg?.currentQuestionIndex ?? -1,
            totalQuestions: 10,
        },
        participants,
        self: {
            participantId: participant.id,
            nickname: participant.nickname,
            isHost: participant.isHost,
            joinedAtQuestion: participant.joinedAtQuestion,
        },
    };

    // playing/revealing 中の問題情報
    if (quizAgg && (room.phase === "playing" || room.phase === "revealing")) {
        const quizData = quizAgg.toQuiz();
        const currentQ = quizAgg.currentQuestion;
        if (currentQ) {
            sync.currentQuestion = {
                index: currentQ.index,
                text: currentQ.text,
                choices: currentQ.choices,
                timerEndsAt: quizData.timerEndsAt ?? 0,
                answeredCount: quizAgg.getAnsweredCount(),
                totalParticipants: roomAgg.getConnectedParticipants().length,
            };
        }

        // revealing 中は正解情報も含む
        if (room.phase === "revealing" && currentQ) {
            const scores = quizAgg.computeScoreboard(room.participants);
            sync.revealedAnswer = {
                correctIndex: currentQ.correctIndex,
                explanation: currentQ.explanation,
                scores,
            };
        }
    }

    return sync;
}

// ============================================================
// ハンドラ登録
// ============================================================

export function registerRoomHandlers(
    io: Server,
    socket: Socket,
    roomRepo: RoomRepository,
    quizRepo: QuizRepository,
    timerService: NodeTimerService,
): void {
    // ----------------------------------------------------------
    // room:create
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_CREATE, (payload: unknown) => {
        try {
            const parsed = CreateRoomSchema.parse(payload);
            const nickname = sanitize(parsed.nickname);

            const roomCode = generateRoomCode(roomRepo);
            const roomAgg = RoomAggregate.create(roomCode, nickname, socket.id);
            const room = roomAgg.toRoom();

            roomRepo.save(room);

            const host = roomAgg.findBySocketId(socket.id)!;
            socketSessions.set(socket.id, { roomCode, participantId: host.id });

            void socket.join(roomCode);

            const roomState = buildRoomStateSync(roomAgg, quizRepo, host);
            const response: RoomCreatedPayload = {
                roomCode,
                participantId: host.id,
                roomState,
            };

            socket.emit(S2C_EVENTS.ROOM_CREATED, response);
            logger.info({ roomCode, nickname, participantId: host.id }, "Room created");
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // room:join
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_JOIN, (payload: unknown) => {
        try {
            const parsed = JoinRoomSchema.parse(payload);
            const roomCode = parsed.roomCode.toUpperCase();
            const nickname = sanitize(parsed.nickname);

            const room = roomRepo.findByCode(roomCode);
            if (!room) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "ROOM_NOT_FOUND",
                    message: "ルームが見つかりません",
                } satisfies RoomErrorPayload);
                return;
            }

            const roomAgg = RoomAggregate.fromRoom(room);

            // 再接続判定: 同じ nickname の切断中参加者がいれば復帰扱い
            const reconnected = roomAgg.reconnectParticipant(nickname, socket.id);

            if (reconnected) {
                // Host 再接続タイマーのキャンセル
                timerService.cancel(`host-transfer:${roomCode}`);

                roomRepo.save(roomAgg.toRoom());
                socketSessions.set(socket.id, { roomCode, participantId: reconnected.id });

                void socket.join(roomCode);

                const roomState = buildRoomStateSync(roomAgg, quizRepo, reconnected);
                const response: RoomJoinedPayload = {
                    participantId: reconnected.id,
                    roomState,
                };

                socket.emit(S2C_EVENTS.ROOM_JOINED, response);

                const joined: ParticipantJoinedPayload = {
                    nickname: reconnected.nickname,
                    isHost: reconnected.isHost,
                    participantCount: roomAgg.participantCount,
                };
                socket.to(roomCode).emit(S2C_EVENTS.ROOM_PARTICIPANT_JOINED, joined);

                logger.info({ roomCode, nickname, participantId: reconnected.id }, "Participant reconnected");
                return;
            }

            // 新規参加
            const quizData = quizRepo.findByRoomCode(roomCode);
            const currentQuestionIndex = quizData?.currentQuestionIndex ?? -1;

            const participant = roomAgg.addParticipant(nickname, socket.id, currentQuestionIndex);
            roomRepo.save(roomAgg.toRoom());
            socketSessions.set(socket.id, { roomCode, participantId: participant.id });

            void socket.join(roomCode);

            const roomState = buildRoomStateSync(roomAgg, quizRepo, participant);
            const response: RoomJoinedPayload = {
                participantId: participant.id,
                roomState,
            };

            socket.emit(S2C_EVENTS.ROOM_JOINED, response);

            const joined: ParticipantJoinedPayload = {
                nickname: participant.nickname,
                isHost: participant.isHost,
                participantCount: roomAgg.participantCount,
            };
            socket.to(roomCode).emit(S2C_EVENTS.ROOM_PARTICIPANT_JOINED, joined);

            logger.info({ roomCode, nickname, participantId: participant.id }, "Participant joined");
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // room:leave
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_LEAVE, () => {
        handleDisconnect(io, socket, roomRepo, quizRepo, timerService);
    });

    // ----------------------------------------------------------
    // room:close
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_CLOSE, () => {
        try {
            const session = socketSessions.get(socket.id);
            if (!session) return;

            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);
            if (!roomAgg.isHost(session.participantId)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "NOT_HOST",
                    message: "ホストのみがルームを閉じられます",
                } satisfies RoomErrorPayload);
                return;
            }

            // 全員に通知して Room を削除
            io.to(session.roomCode).emit(S2C_EVENTS.ROOM_CLOSED, {});

            // 全ソケットを退室
            const sockets = io.sockets.adapter.rooms.get(session.roomCode);
            if (sockets) {
                for (const sid of sockets) {
                    const s = io.sockets.sockets.get(sid);
                    if (s) {
                        void s.leave(session.roomCode);
                        socketSessions.delete(sid);
                    }
                }
            }

            timerService.cancel(session.roomCode);
            timerService.cancel(`host-transfer:${session.roomCode}`);
            roomRepo.delete(session.roomCode);
            quizRepo.delete(session.roomCode);

            logger.info({ roomCode: session.roomCode }, "Room closed by host");
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // profile:submit
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.PROFILE_SUBMIT, (payload: unknown) => {
        try {
            const parsed = SubmitProfileSchema.parse(payload);
            const profile = sanitizeProfile(parsed.profile);

            const session = socketSessions.get(socket.id);
            if (!session) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "NOT_IN_ROOM",
                    message: "ルームに参加していません",
                } satisfies RoomErrorPayload);
                return;
            }

            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);
            roomAgg.updateProfile(session.participantId, profile);
            roomRepo.save(roomAgg.toRoom());

            const participant = roomAgg.getParticipant(session.participantId);
            const response: ProfileUpdatedPayload = {
                nickname: participant?.nickname ?? "",
                profileSubmittedCount: roomAgg.getProfileSubmittedCount(),
                totalParticipants: roomAgg.participantCount,
            };

            io.to(session.roomCode).emit(S2C_EVENTS.PROFILE_UPDATED, response);

            logger.info(
                { roomCode: session.roomCode, nickname: participant?.nickname },
                "Profile submitted",
            );
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // disconnect（Socket.IO 内蔵イベント）
    // ----------------------------------------------------------
    socket.on("disconnect", () => {
        handleDisconnect(io, socket, roomRepo, quizRepo, timerService);
    });
}

// ============================================================
// disconnect / leave の共通処理
// ============================================================

function handleDisconnect(
    io: Server,
    socket: Socket,
    roomRepo: RoomRepository,
    quizRepo: QuizRepository,
    timerService: NodeTimerService,
): void {
    const session = socketSessions.get(socket.id);
    if (!session) return;

    const room = roomRepo.findByCode(session.roomCode);
    if (!room) {
        socketSessions.delete(socket.id);
        return;
    }

    const roomAgg = RoomAggregate.fromRoom(room);
    roomAgg.disconnectParticipant(session.participantId);

    const participant = roomAgg.getParticipant(session.participantId);
    if (!participant) {
        socketSessions.delete(socket.id);
        return;
    }

    roomRepo.save(roomAgg.toRoom());
    void socket.leave(session.roomCode);
    socketSessions.delete(socket.id);

    const left: ParticipantLeftPayload = {
        nickname: participant.nickname,
        participantCount: roomAgg.getConnectedParticipants().length,
    };
    socket.to(session.roomCode).emit(S2C_EVENTS.ROOM_PARTICIPANT_LEFT, left);

    // Host が切断した場合、再接続猶予後に移譲
    if (roomAgg.isHost(session.participantId)) {
        timerService.schedule(
            `host-transfer:${session.roomCode}`,
            HOST_RECONNECT_GRACE_MS,
            () => {
                const latestRoom = roomRepo.findByCode(session.roomCode);
                if (!latestRoom) return;

                const latestAgg = RoomAggregate.fromRoom(latestRoom);
                const host = latestAgg.getParticipant(session.participantId);

                // 再接続していなければ移譲
                if (host && !host.isConnected) {
                    const newHost = latestAgg.transferHost();
                    if (newHost) {
                        roomRepo.save(latestAgg.toRoom());
                        const changed: HostChangedPayload = {
                            newHostNickname: newHost.nickname,
                            newHostId: newHost.id,
                        };
                        io.to(session.roomCode).emit(S2C_EVENTS.ROOM_HOST_CHANGED, changed);
                        logger.info(
                            { roomCode: session.roomCode, newHost: newHost.nickname },
                            "Host transferred",
                        );
                    }
                }
            },
        );
    }

    logger.info(
        { roomCode: session.roomCode, nickname: participant.nickname },
        "Participant disconnected",
    );
}

// ============================================================
// エラーハンドリング
// ============================================================

function emitError(socket: Socket, error: unknown): void {
    if (error instanceof RoomDomainError) {
        socket.emit(S2C_EVENTS.ROOM_ERROR, {
            code: error.code,
            message: error.message,
        } satisfies RoomErrorPayload);
        return;
    }

    // Zod バリデーションエラー
    if (error instanceof Error && error.name === "ZodError") {
        socket.emit(S2C_EVENTS.ROOM_ERROR, {
            code: "VALIDATION_ERROR",
            message: "入力内容が不正です",
        } satisfies RoomErrorPayload);
        return;
    }

    logger.error({ error }, "Unexpected error in room handler");
    socket.emit(S2C_EVENTS.ROOM_ERROR, {
        code: "INTERNAL_ERROR",
        message: "サーバ内部エラーが発生しました",
    } satisfies RoomErrorPayload);
}

// ============================================================
// Export: socketSessions（他ハンドラからの参照用）
// ============================================================

export { socketSessions };
