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
    CheckNicknameSchema,
    SubmitProfileSchema,
    MAX_PARTICIPANTS,
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
    NicknameResultPayload,
    Participant,
    RoomSummary,
    RoomListPayload,
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
// ルーム一覧購読用メタルーム名
// 通常のゲームルーム（英数字コード）と名前が衝突しないようにプレフィックス付き
// ============================================================
const ROOM_LIST_META_ROOM = "__room_list__";

// ============================================================
// Helper: ルーム一覧ブロードキャスト
// ============================================================

/**
 * 全ルームのサマリーを構築し、購読中のクライアントにブロードキャストする。
 * ルームの作成・参加・離脱・フェーズ変更など、一覧に影響する操作のあとに呼び出す。
 */
export function broadcastRoomList(io: Server, roomRepo: RoomRepository): void {
    const rooms: RoomSummary[] = [];

    for (const [, room] of roomRepo.findAll()) {
        const host = Array.from(room.participants.values()).find((p) => p.isHost);
        rooms.push({
            code: room.code,
            phase: room.phase,
            hostNickname: host?.nickname ?? "",
            participants: Array.from(room.participants.values()).map((p) => ({
                nickname: p.nickname,
                isConnected: p.isConnected,
            })),
            participantCount: room.participants.size,
            maxParticipants: MAX_PARTICIPANTS,
            createdAt: room.createdAt,
        });
    }

    const payload: RoomListPayload = { rooms };
    io.to(ROOM_LIST_META_ROOM).emit(S2C_EVENTS.ROOM_LIST, payload);
}

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
    // room:list-subscribe——ルーム一覧のリアルタイム購読開始
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_LIST_SUBSCRIBE, () => {
        void socket.join(ROOM_LIST_META_ROOM);

        // 即座に現在のルーム一覧を返信
        const rooms: RoomSummary[] = [];
        for (const [, room] of roomRepo.findAll()) {
            const host = Array.from(room.participants.values()).find((p) => p.isHost);
            rooms.push({
                code: room.code,
                phase: room.phase,
                hostNickname: host?.nickname ?? "",
                participants: Array.from(room.participants.values()).map((p) => ({
                    nickname: p.nickname,
                    isConnected: p.isConnected,
                })),
                participantCount: room.participants.size,
                maxParticipants: MAX_PARTICIPANTS,
                createdAt: room.createdAt,
            });
        }
        socket.emit(S2C_EVENTS.ROOM_LIST, { rooms } satisfies RoomListPayload);
        logger.info({ socketId: socket.id }, "Room list subscribed");
    });

    // ----------------------------------------------------------
    // room:list-unsubscribe——ルーム一覧の購読解除
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_LIST_UNSUBSCRIBE, () => {
        void socket.leave(ROOM_LIST_META_ROOM);
        logger.info({ socketId: socket.id }, "Room list unsubscribed");
    });

    // ----------------------------------------------------------
    // room:check-nickname——ニックネーム重複チェック（参加前の事前確認）
    // ルームに join していなくても発行可能な読み取り専用チェック。
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_CHECK_NICKNAME, (payload: unknown) => {
        try {
            const parsed = CheckNicknameSchema.parse(payload);
            const roomCode = parsed.roomCode.toUpperCase();
            const nickname = parsed.nickname;

            const room = roomRepo.findByCode(roomCode);
            if (!room) {
                // ルームが存在しない場合は reason で区別し、クライアントが適切なメッセージを表示
                socket.emit(S2C_EVENTS.ROOM_NICKNAME_RESULT, {
                    available: false,
                    roomCode,
                    nickname,
                    reason: "ROOM_NOT_FOUND",
                } satisfies NicknameResultPayload);
                return;
            }

            const roomAgg = RoomAggregate.fromRoom(room);
            const available = roomAgg.isNicknameAvailable(nickname);

            socket.emit(S2C_EVENTS.ROOM_NICKNAME_RESULT, {
                available,
                roomCode,
                nickname,
                ...(!available ? { reason: "NICKNAME_TAKEN" as const } : {}),
            } satisfies NicknameResultPayload);
        } catch (error) {
            // バリデーションエラー等は無視（事前チェックなのでエラー通知不要）
            logger.debug({ error, socketId: socket.id }, "check-nickname validation failed");
        }
    });

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

            broadcastRoomList(io, roomRepo);
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

                broadcastRoomList(io, roomRepo);
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

            broadcastRoomList(io, roomRepo);
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

            broadcastRoomList(io, roomRepo);
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // room:back-to-lobby——クイズ終了後にロビーへ戻る
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.ROOM_BACK_TO_LOBBY, () => {
        try {
            const session = socketSessions.get(socket.id);
            if (!session) return;

            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);

            // Host 権限チェック
            if (!roomAgg.isHost(session.participantId)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "NOT_HOST",
                    message: "ホストのみがロビーに戻れます",
                } satisfies RoomErrorPayload);
                return;
            }

            // ドメインロジック: finished → lobby, joinedAtQuestion リセット
            roomAgg.backToLobby();
            roomRepo.save(roomAgg.toRoom());

            // クイズデータを削除（次回生成のためにクリーンな状態に）
            quizRepo.delete(session.roomCode);

            // タイマーをキャンセル（念のため）
            timerService.cancel(session.roomCode);

            // 各クライアントに個別の RoomStateSync を送信（self 情報が異なるため）
            const sockets = io.sockets.adapter.rooms.get(session.roomCode);
            if (sockets) {
                for (const sid of sockets) {
                    const sess = socketSessions.get(sid);
                    if (!sess) continue;
                    const participant = roomAgg.getParticipant(sess.participantId);
                    if (!participant) continue;
                    const sync = buildRoomStateSync(roomAgg, quizRepo, participant);
                    io.to(sid).emit(S2C_EVENTS.ROOM_BACK_TO_LOBBY, sync);
                }
            }

            logger.info({ roomCode: session.roomCode }, "Room returned to lobby by host");

            broadcastRoomList(io, roomRepo);
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

    // 切断 + ホスト移譲を1つのドメインオペレーションで実行
    const { newHost, roomEmpty } = roomAgg.disconnectAndTransferHost(session.participantId);

    const participant = roomAgg.getParticipant(session.participantId);
    if (!participant) {
        socketSessions.delete(socket.id);
        return;
    }

    void socket.leave(session.roomCode);
    socketSessions.delete(socket.id);

    // 空ルームの場合は即時削除（ドメインルール: 全参加者切断 → ルーム自動削除）
    if (roomEmpty) {
        timerService.cancel(session.roomCode);
        timerService.cancel(`host-transfer:${session.roomCode}`);
        roomRepo.delete(session.roomCode);
        quizRepo.delete(session.roomCode);

        logger.info(
            { roomCode: session.roomCode, nickname: participant.nickname },
            "Room auto-deleted (all participants disconnected)",
        );

        broadcastRoomList(io, roomRepo);
        return;
    }

    roomRepo.save(roomAgg.toRoom());

    const left: ParticipantLeftPayload = {
        nickname: participant.nickname,
        participantCount: roomAgg.getConnectedParticipants().length,
    };
    socket.to(session.roomCode).emit(S2C_EVENTS.ROOM_PARTICIPANT_LEFT, left);

    // ホスト移譲が発生した場合、即座に通知
    if (newHost) {
        const changed: HostChangedPayload = {
            newHostNickname: newHost.nickname,
            newHostId: newHost.id,
        };
        io.to(session.roomCode).emit(S2C_EVENTS.ROOM_HOST_CHANGED, changed);
        logger.info(
            { roomCode: session.roomCode, newHost: newHost.nickname },
            "Host transferred immediately",
        );
    }

    logger.info(
        { roomCode: session.roomCode, nickname: participant.nickname },
        "Participant disconnected",
    );

    broadcastRoomList(io, roomRepo);
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
