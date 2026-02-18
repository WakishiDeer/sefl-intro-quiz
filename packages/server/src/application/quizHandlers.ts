/**
 * quizHandlers.ts — Quiz Context の Socket.IO イベントハンドラ
 *
 * quiz:generate, quiz:next-question, question:answer を処理する。
 * ハンドラは薄く保ち、ドメインロジックは QuizAggregate に委譲する。
 */

import type { Server, Socket } from "socket.io";
import {
    C2S_EVENTS,
    S2C_EVENTS,
    SubmitAnswerSchema,
    DEFAULT_QUESTION_TIME_LIMIT_MS,
    DEFAULT_MIN_PARTICIPANTS,
} from "@self-intro-quiz/shared";
import type {
    RoomErrorPayload,
    QuizGeneratingPayload,
    QuizReadyPayload,
    QuizGenerateFailedPayload,
    AnswerCountPayload,
    QuizFinishedPayload,
} from "@self-intro-quiz/shared";
import { RoomAggregate, RoomDomainError } from "../domain/room/RoomAggregate.js";
import { QuizAggregate, QuizDomainError } from "../domain/quiz/QuizAggregate.js";
import type { RoomRepository } from "../domain/room/RoomRepository.js";
import type { QuizRepository } from "../domain/quiz/QuizRepository.js";
import type { QuizGenerator } from "../domain/quiz/QuizGenerator.js";
import { NodeTimerService } from "../infrastructure/NodeTimerService.js";
import { socketSessions } from "./roomHandlers.js";
import { broadcastRoomList } from "./roomHandlers.js";
import { logger } from "../utils/logger.js";

// ============================================================
// 設定値の取得
// ============================================================

function getQuestionTimeLimit(): number {
    const envValue = process.env["QUESTION_TIME_LIMIT"];
    return envValue ? parseInt(envValue, 10) : DEFAULT_QUESTION_TIME_LIMIT_MS;
}

function getMinParticipants(): number {
    const envValue = process.env["MIN_PARTICIPANTS"];
    return envValue ? parseInt(envValue, 10) : DEFAULT_MIN_PARTICIPANTS;
}

// ============================================================
// ハンドラ登録
// ============================================================

export function registerQuizHandlers(
    io: Server,
    socket: Socket,
    roomRepo: RoomRepository,
    quizRepo: QuizRepository,
    quizGenerator: QuizGenerator,
    timerService: NodeTimerService,
): void {
    // ----------------------------------------------------------
    // quiz:generate
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.QUIZ_GENERATE, () => {
        const session = socketSessions.get(socket.id);
        if (!session) return;

        try {
            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);

            // Host 権限チェック
            if (!roomAgg.isHost(session.participantId)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "NOT_HOST",
                    message: "ホストのみがクイズを生成できます",
                } satisfies RoomErrorPayload);
                return;
            }

            // フェーズチェック
            if (roomAgg.phase !== "lobby") {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "INVALID_PHASE",
                    message: "ロビーフェーズでのみクイズを生成できます",
                } satisfies RoomErrorPayload);
                return;
            }

            // 最低参加者数チェック
            if (!roomAgg.canGenerateQuiz(getMinParticipants())) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "MIN_PARTICIPANTS",
                    message: `プロフィール入力済みの参加者が${getMinParticipants()}人以上必要です`,
                } satisfies RoomErrorPayload);
                return;
            }

            // generating フェーズに遷移
            roomAgg.changePhase("generating");
            roomRepo.save(roomAgg.toRoom());

            const generating: QuizGeneratingPayload = {
                message: "クイズを生成しています...",
            };
            io.to(session.roomCode).emit(S2C_EVENTS.QUIZ_GENERATING, generating);

            // ルーム一覧を更新（generating フェーズに遷移したため）
            broadcastRoomList(io, roomRepo);

            // AI クイズ生成（非同期）
            const participants = Array.from(room.participants.values())
                .filter((p) => p.profile !== null)
                .map((p) => ({
                    id: p.id,
                    nickname: p.nickname,
                    profile: p.profile!,
                }));

            void (async () => {
                try {
                    const questions = await quizGenerator.generate(participants);
                    const quizAgg = QuizAggregate.create(session.roomCode, questions);
                    quizRepo.save(quizAgg.toQuiz());

                    const ready: QuizReadyPayload = {
                        totalQuestions: questions.length,
                    };
                    io.to(session.roomCode).emit(S2C_EVENTS.QUIZ_READY, ready);

                    broadcastRoomList(io, roomRepo);

                    logger.info(
                        { roomCode: session.roomCode, questionCount: questions.length },
                        "Quiz generated successfully",
                    );
                } catch (error) {
                    // 生成失敗 → lobby に戻す
                    const latestRoom = roomRepo.findByCode(session.roomCode);
                    if (latestRoom) {
                        const latestAgg = RoomAggregate.fromRoom(latestRoom);
                        latestAgg.changePhase("lobby");
                        roomRepo.save(latestAgg.toRoom());
                    }

                    const failed: QuizGenerateFailedPayload = {
                        message: "クイズの生成に失敗しました。もう一度お試しください。",
                    };
                    io.to(session.roomCode).emit(S2C_EVENTS.QUIZ_GENERATE_FAILED, failed);

                    broadcastRoomList(io, roomRepo);

                    logger.error(
                        { roomCode: session.roomCode, error: error instanceof Error ? error.message : String(error) },
                        "Quiz generation failed",
                    );
                }
            })();
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // quiz:next-question
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.QUIZ_NEXT_QUESTION, () => {
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
                    message: "ホストのみが次の問題に進めます",
                } satisfies RoomErrorPayload);
                return;
            }

            const quiz = quizRepo.findByRoomCode(session.roomCode);
            if (!quiz) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "QUIZ_NOT_FOUND",
                    message: "クイズが見つかりません",
                } satisfies RoomErrorPayload);
                return;
            }

            const quizAgg = QuizAggregate.fromQuiz(quiz);
            const timeLimit = getQuestionTimeLimit();
            const timerEndsAt = Date.now() + timeLimit;

            // 回答可能な参加者数を計算
            const eligibleParticipants = getEligibleParticipants(roomAgg, quizAgg.currentQuestionIndex + 1);
            const totalParticipants = eligibleParticipants.length;

            // フェーズに応じた遷移
            if (roomAgg.phase === "generating" || (roomAgg.phase === "lobby" && quiz.questions.length > 0)) {
                // 最初の問題を開始
                const startPayload = quizAgg.start(timerEndsAt, totalParticipants);
                roomAgg.changePhase("playing");
                roomRepo.save(roomAgg.toRoom());
                quizRepo.save(quizAgg.toQuiz());

                io.to(session.roomCode).emit(S2C_EVENTS.QUESTION_START, startPayload);

                // タイマーセット
                scheduleTimeout(io, session.roomCode, roomRepo, quizRepo, quizAgg, roomAgg, timerService, timeLimit);

                logger.info({ roomCode: session.roomCode, questionIndex: 0 }, "Quiz started");

                broadcastRoomList(io, roomRepo);
            } else if (roomAgg.phase === "revealing") {
                // 次の問題 or 終了
                const nextEligible = getEligibleParticipants(roomAgg, quizAgg.currentQuestionIndex + 1);
                const startPayload = quizAgg.nextQuestion(timerEndsAt, nextEligible.length);

                if (startPayload) {
                    // 次の問題
                    roomAgg.changePhase("playing");
                    roomRepo.save(roomAgg.toRoom());
                    quizRepo.save(quizAgg.toQuiz());

                    io.to(session.roomCode).emit(S2C_EVENTS.QUESTION_START, startPayload);

                    scheduleTimeout(io, session.roomCode, roomRepo, quizRepo, quizAgg, roomAgg, timerService, timeLimit);

                    logger.info(
                        { roomCode: session.roomCode, questionIndex: startPayload.index },
                        "Next question started",
                    );
                } else {
                    // 全問終了
                    roomAgg.changePhase("finished");
                    roomRepo.save(roomAgg.toRoom());
                    quizRepo.save(quizAgg.toQuiz());

                    const finalScores = quizAgg.computeScoreboard(room.participants);
                    const finished: QuizFinishedPayload = { finalScores };
                    io.to(session.roomCode).emit(S2C_EVENTS.QUIZ_FINISHED, finished);

                    timerService.cancel(session.roomCode);

                    logger.info({ roomCode: session.roomCode }, "Quiz finished");

                    broadcastRoomList(io, roomRepo);
                }
            } else {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "INVALID_PHASE",
                    message: "現在のフェーズでは次の問題に進めません",
                } satisfies RoomErrorPayload);
            }
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // question:answer
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.QUESTION_ANSWER, (payload: unknown) => {
        try {
            const parsed = SubmitAnswerSchema.parse(payload);
            const session = socketSessions.get(socket.id);
            if (!session) return;

            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);

            // フェーズチェック
            if (roomAgg.phase !== "playing") {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "INVALID_PHASE",
                    message: "回答受付中ではありません",
                } satisfies RoomErrorPayload);
                return;
            }

            const quiz = quizRepo.findByRoomCode(session.roomCode);
            if (!quiz) return;

            const quizAgg = QuizAggregate.fromQuiz(quiz);

            // 問題番号チェック
            if (parsed.questionIndex !== quizAgg.currentQuestionIndex) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "QUESTION_CLOSED",
                    message: "この問題は既に終了しています",
                } satisfies RoomErrorPayload);
                return;
            }

            // 回答可能チェック
            const participant = roomAgg.getParticipant(session.participantId);
            if (!participant) return;

            if (!quizAgg.canAnswer(session.participantId, parsed.questionIndex, participant.joinedAtQuestion)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "ALREADY_ANSWERED",
                    message: "この問題には既に回答済みです",
                } satisfies RoomErrorPayload);
                return;
            }

            // 回答記録
            quizAgg.submitAnswer(session.participantId, parsed.choiceIndex);
            quizRepo.save(quizAgg.toQuiz());

            // 回答数を broadcast
            const eligibleParticipants = getEligibleParticipants(roomAgg, quizAgg.currentQuestionIndex);
            const answerCount: AnswerCountPayload = {
                answeredCount: quizAgg.getAnsweredCount(),
                totalParticipants: eligibleParticipants.length,
            };
            io.to(session.roomCode).emit(S2C_EVENTS.QUESTION_ANSWER_COUNT, answerCount);

            // 全員回答済みなら即座に reveal
            if (quizAgg.allAnswered(eligibleParticipants.length)) {
                timerService.cancel(session.roomCode);
                triggerReveal(io, session.roomCode, roomRepo, quizRepo);
            }

            logger.info(
                {
                    roomCode: session.roomCode,
                    participantId: session.participantId,
                    questionIndex: parsed.questionIndex,
                },
                "Answer submitted",
            );
        } catch (error) {
            emitError(socket, error);
        }
    });
}

// ============================================================
// Private helpers
// ============================================================

/**
 * 指定された問題番号に回答可能な接続中参加者を取得する。
 */
function getEligibleParticipants(roomAgg: RoomAggregate, questionIndex: number) {
    return roomAgg.getConnectedParticipants().filter((p) => {
        return p.joinedAtQuestion === -1 || p.joinedAtQuestion <= questionIndex;
    });
}

/**
 * タイムアウトタイマーをスケジュールする。
 */
function scheduleTimeout(
    io: Server,
    roomCode: string,
    roomRepo: RoomRepository,
    quizRepo: QuizRepository,
    _quizAgg: QuizAggregate,
    _roomAgg: RoomAggregate,
    timerService: NodeTimerService,
    timeLimit: number,
): void {
    timerService.schedule(roomCode, timeLimit, () => {
        triggerReveal(io, roomCode, roomRepo, quizRepo);
    });
}

/**
 * 正解を発表して revealing フェーズに遷移する。
 */
function triggerReveal(
    io: Server,
    roomCode: string,
    roomRepo: RoomRepository,
    quizRepo: QuizRepository,
): void {
    const room = roomRepo.findByCode(roomCode);
    if (!room) return;

    const quiz = quizRepo.findByRoomCode(roomCode);
    if (!quiz) return;

    const roomAgg = RoomAggregate.fromRoom(room);
    const quizAgg = QuizAggregate.fromQuiz(quiz);

    // 未回答者にタイムアウト回答を記録
    const eligible = getEligibleParticipants(roomAgg, quizAgg.currentQuestionIndex);
    quizAgg.recordTimeouts(eligible.map((p) => p.id));

    // revealing に遷移
    roomAgg.changePhase("revealing");
    const revealPayload = quizAgg.reveal(room.participants);

    roomRepo.save(roomAgg.toRoom());
    quizRepo.save(quizAgg.toQuiz());

    io.to(roomCode).emit(S2C_EVENTS.QUESTION_REVEAL, revealPayload);

    logger.info(
        { roomCode, questionIndex: quizAgg.currentQuestionIndex },
        "Question revealed",
    );

    // revealing フェーズに遷移したためルーム一覧を更新
    broadcastRoomList(io, roomRepo);
}

// ============================================================
// エラーハンドリング
// ============================================================

function emitError(socket: Socket, error: unknown): void {
    if (error instanceof RoomDomainError || error instanceof QuizDomainError) {
        socket.emit(S2C_EVENTS.ROOM_ERROR, {
            code: error.code,
            message: error.message,
        } satisfies RoomErrorPayload);
        return;
    }

    if (error instanceof Error && error.name === "ZodError") {
        socket.emit(S2C_EVENTS.ROOM_ERROR, {
            code: "VALIDATION_ERROR",
            message: "入力内容が不正です",
        } satisfies RoomErrorPayload);
        return;
    }

    logger.error({ error }, "Unexpected error in quiz handler");
    socket.emit(S2C_EVENTS.ROOM_ERROR, {
        code: "INTERNAL_ERROR",
        message: "サーバ内部エラーが発生しました",
    } satisfies RoomErrorPayload);
}
