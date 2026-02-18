/**
 * aiRequestHandlers.ts — みんなで AI リクエスト機能の Socket.IO イベントハンドラ
 *
 * ホストが発動 → 全参加者にリクエスト入力を依頼 → 集約して AI に項目提案させる。
 * lobby フェーズのサブフローとして動作し、フェーズ遷移は行わない。
 */

import type { Server, Socket } from "socket.io";
import {
    C2S_EVENTS,
    S2C_EVENTS,
    AIRequestSubmitSchema,
    AIRequestAdoptSchema,
    AI_REQUEST_TIMEOUT_MS,
} from "@self-intro-quiz/shared";
import type {
    RoomErrorPayload,
    FieldsUpdatedPayload,
    AIRequestStartedPayload,
    AIRequestStatusPayload,
    AIRequestResultPayload,
    AIRequestCancelledPayload,
} from "@self-intro-quiz/shared";
import { RoomAggregate, RoomDomainError } from "../domain/room/RoomAggregate.js";
import type { RoomRepository } from "../domain/room/RoomRepository.js";
import type { ProfileFieldSuggester, AIRequestInput } from "../domain/room/ProfileFieldSuggester.js";
import { NodeTimerService } from "../infrastructure/NodeTimerService.js";
import { socketSessions } from "./roomHandlers.js";
import { broadcastRoomList } from "./roomHandlers.js";
import { logger } from "../utils/logger.js";

// ============================================================
// AI リクエストのインメモリ状態管理
// ============================================================

/** ルームごとの AI リクエスト収集状態 */
interface AIRequestSession {
    /** 収集中かどうか */
    active: boolean;
    /** 受付終了時刻 */
    expiresAt: number;
    /** participantId → リクエスト内容 */
    submissions: Map<string, AIRequestInput>;
}

/** roomCode → AIRequestSession */
const aiRequestSessions = new Map<string, AIRequestSession>();

// ============================================================
// AI リクエストセッションのキャンセル（外部から呼び出し可能）
// ============================================================

/**
 * 指定ルームの AI リクエストセッションをキャンセルし、全参加者に通知する。
 * ホストの明示的キャンセルや、ホスト切断時に roomHandlers から呼び出される。
 */
export function cancelAIRequestSession(
    roomCode: string,
    io: Server,
    timerService: NodeTimerService,
): boolean {
    const reqSession = aiRequestSessions.get(roomCode);
    if (!reqSession) return false;

    aiRequestSessions.delete(roomCode);
    timerService.cancel(`ai-request:${roomCode}`);

    const payload: AIRequestCancelledPayload = {
        message: "AI リクエストがキャンセルされました",
    };
    io.to(roomCode).emit(S2C_EVENTS.AI_REQUEST_CANCELLED, payload);

    logger.info({ roomCode }, "AI request session cancelled");
    return true;
}

// ============================================================
// ハンドラ登録
// ============================================================

export function registerAIRequestHandlers(
    io: Server,
    socket: Socket,
    roomRepo: RoomRepository,
    fieldSuggester: ProfileFieldSuggester,
    timerService: NodeTimerService,
): void {
    // ----------------------------------------------------------
    // ai-request:start — ホストが AI リクエスト収集を開始
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_START, () => {
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
                    message: "ホストのみが AI リクエストを開始できます",
                } satisfies RoomErrorPayload);
                return;
            }

            // フェーズチェック
            if (roomAgg.phase !== "lobby") {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "INVALID_PHASE",
                    message: "ロビーフェーズでのみ AI リクエストを使用できます",
                } satisfies RoomErrorPayload);
                return;
            }

            // 既にアクティブなセッションがある場合はエラー
            if (aiRequestSessions.has(session.roomCode)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "AI_REQUEST_ACTIVE",
                    message: "AI リクエストが既に進行中です",
                } satisfies RoomErrorPayload);
                return;
            }

            const expiresAt = Date.now() + AI_REQUEST_TIMEOUT_MS;

            // セッション作成
            aiRequestSessions.set(session.roomCode, {
                active: true,
                expiresAt,
                submissions: new Map(),
            });

            // 全員に通知
            const payload: AIRequestStartedPayload = {
                message: "みんなで AI リクエスト！ほしい項目を教えてください 🤖",
                expiresAt,
            };
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_STARTED, payload);

            // タイムアウトタイマー設定（自動finalize はせず、ホストに委ねる）
            timerService.schedule(`ai-request:${session.roomCode}`, AI_REQUEST_TIMEOUT_MS, () => {
                // タイムアウト時はセッションを終了するだけ（自動生成はしない）
                const reqSession = aiRequestSessions.get(session.roomCode);
                if (reqSession) {
                    reqSession.active = false;
                }
            });

            logger.info({ roomCode: session.roomCode }, "AI request collection started");
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // ai-request:submit — 参加者がリクエストを送信
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_SUBMIT, (payload: unknown) => {
        try {
            const parsed = AIRequestSubmitSchema.parse(payload);

            const session = socketSessions.get(socket.id);
            if (!session) return;

            const reqSession = aiRequestSessions.get(session.roomCode);
            if (!reqSession || !reqSession.active) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "AI_REQUEST_NOT_ACTIVE",
                    message: "AI リクエストは受付中ではありません",
                } satisfies RoomErrorPayload);
                return;
            }

            // リクエストを記録
            reqSession.submissions.set(session.participantId, {
                presets: parsed.presets,
                freeText: parsed.freeText,
            });

            // 参加者数を取得
            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;
            const roomAgg = RoomAggregate.fromRoom(room);
            const connectedCount = roomAgg.getConnectedParticipants().length;

            // 収集状況をブロードキャスト
            const status: AIRequestStatusPayload = {
                submittedCount: reqSession.submissions.size,
                totalParticipants: connectedCount,
            };
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_STATUS, status);

            logger.info(
                {
                    roomCode: session.roomCode,
                    participantId: session.participantId,
                    submittedCount: reqSession.submissions.size,
                },
                "AI request submitted",
            );
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // ai-request:finalize — ホストが収集を打ち切り、AI 生成を開始
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_FINALIZE, () => {
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
                    message: "ホストのみが AI リクエストを確定できます",
                } satisfies RoomErrorPayload);
                return;
            }

            const reqSession = aiRequestSessions.get(session.roomCode);
            if (!reqSession) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "AI_REQUEST_NOT_ACTIVE",
                    message: "AI リクエストセッションがありません",
                } satisfies RoomErrorPayload);
                return;
            }

            // 収集を終了
            reqSession.active = false;
            timerService.cancel(`ai-request:${session.roomCode}`);

            // リクエストが0件の場合もエラーにせず、現在の項目ベースで提案
            const requests = Array.from(reqSession.submissions.values());
            const currentFields = roomAgg.profileFields;

            // 全員に「生成中」を通知（クライアントのモーダル切り替え用）
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_GENERATING, {});

            // AI 生成（非同期）
            void (async () => {
                try {
                    const suggestedFields = await fieldSuggester.suggest(requests, currentFields);

                    const result: AIRequestResultPayload = { suggestedFields };
                    // ホストにのみ結果を送信（ホストが採用判断する）
                    socket.emit(S2C_EVENTS.AI_REQUEST_RESULT, result);

                    logger.info(
                        {
                            roomCode: session.roomCode,
                            requestCount: requests.length,
                            suggestedFieldCount: suggestedFields.length,
                        },
                        "AI field suggestion completed",
                    );
                } catch (error) {
                    socket.emit(S2C_EVENTS.ROOM_ERROR, {
                        code: "AI_REQUEST_FAILED",
                        message: "AI による項目提案に失敗しました。もう一度お試しください。",
                    } satisfies RoomErrorPayload);

                    logger.error(
                        {
                            roomCode: session.roomCode,
                            error: error instanceof Error ? error.message : String(error),
                        },
                        "AI field suggestion failed",
                    );
                } finally {
                    // セッションをクリーンアップ
                    aiRequestSessions.delete(session.roomCode);
                }
            })();
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // ai-request:adopt — ホストが AI 提案を採用
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_ADOPT, (payload: unknown) => {
        try {
            const parsed = AIRequestAdoptSchema.parse(payload);

            const session = socketSessions.get(socket.id);
            if (!session) return;

            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;

            const roomAgg = RoomAggregate.fromRoom(room);

            // fields:update と同等の処理
            const profilesInvalidated = roomAgg.updateProfileFields(
                parsed.fields,
                session.participantId,
            );
            roomRepo.save(roomAgg.toRoom());

            const response: FieldsUpdatedPayload = {
                fields: roomAgg.profileFields,
                profilesInvalidated,
            };
            io.to(session.roomCode).emit(S2C_EVENTS.FIELDS_UPDATED, response);

            // AI リクエストセッションをクリーンアップ
            aiRequestSessions.delete(session.roomCode);

            logger.info(
                {
                    roomCode: session.roomCode,
                    fieldCount: parsed.fields.length,
                    profilesInvalidated,
                },
                "AI suggested fields adopted by host",
            );

            broadcastRoomList(io, roomRepo);
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // ai-request:cancel — ホストが AI リクエストをキャンセル
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_CANCEL, () => {
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
                    message: "ホストのみが AI リクエストをキャンセルできます",
                } satisfies RoomErrorPayload);
                return;
            }

            const cancelled = cancelAIRequestSession(session.roomCode, io, timerService);
            if (!cancelled) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "AI_REQUEST_NOT_ACTIVE",
                    message: "AI リクエストセッションがありません",
                } satisfies RoomErrorPayload);
            }
        } catch (error) {
            emitError(socket, error);
        }
    });
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

    if (error instanceof Error && error.name === "ZodError") {
        socket.emit(S2C_EVENTS.ROOM_ERROR, {
            code: "VALIDATION_ERROR",
            message: "入力内容が不正です",
        } satisfies RoomErrorPayload);
        return;
    }

    logger.error({ error }, "Unexpected error in AI request handler");
    socket.emit(S2C_EVENTS.ROOM_ERROR, {
        code: "INTERNAL_ERROR",
        message: "サーバ内部エラーが発生しました",
    } satisfies RoomErrorPayload);
}
