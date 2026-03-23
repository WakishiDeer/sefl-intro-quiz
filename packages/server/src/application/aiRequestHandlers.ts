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
    /** キャンセル済みかどうか（AI 生成中にキャンセルされた場合、結果送信を抑止する） */
    cancelled: boolean;
    /** 受付終了時刻 */
    expiresAt: number;
    /** participantId → リクエスト内容 */
    submissions: Map<string, AIRequestInput>;
    /** オプトアウト（モーダルを閉じて不参加）した participantId の集合 */
    dismissed: Set<string>;
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

    // cancelled フラグを立てて、非同期 AI 生成の結果送信を抑止する
    reqSession.cancelled = true;
    reqSession.active = false;
    aiRequestSessions.delete(roomCode);
    timerService.cancel(`ai-request:${roomCode}`);

    const payload: AIRequestCancelledPayload = {
        message: "AI リクエストがキャンセルされました",
        reason: "cancelled",
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
                cancelled: false,
                expiresAt,
                submissions: new Map(),
                dismissed: new Set(),
            });

            // 接続中の参加者数を取得
            const connectedCount = roomAgg.getConnectedParticipants().length;

            // 全員に通知
            const payload: AIRequestStartedPayload = {
                message: "みんなで AI リクエスト！ほしい項目を教えてください 🤖",
                expiresAt,
                totalParticipants: connectedCount,
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

            // 重複送信チェック — 同一参加者からの二重送信を拒否
            if (reqSession.submissions.has(session.participantId)) {
                socket.emit(S2C_EVENTS.ROOM_ERROR, {
                    code: "AI_REQUEST_ALREADY_SUBMITTED",
                    message: "既にリクエストを送信済みです",
                } satisfies RoomErrorPayload);
                return;
            }

            // リクエストを記録
            reqSession.submissions.set(session.participantId, {
                presets: parsed.presets,
                freeText: parsed.freeText,
            });

            // 送信したユーザーが以前 dismiss していた場合は復帰させる
            reqSession.dismissed.delete(session.participantId);

            // 参加者数を取得（dismissed を除外した有効参加者数）
            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;
            const roomAgg = RoomAggregate.fromRoom(room);
            const connectedCount = roomAgg.getConnectedParticipants().length;
            const effectiveTotal = connectedCount - reqSession.dismissed.size;

            // 収集状況をブロードキャスト
            const status: AIRequestStatusPayload = {
                submittedCount: reqSession.submissions.size,
                totalParticipants: effectiveTotal,
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

            // 全員がリクエスト送信済みなら自動的に finalize
            if (reqSession.submissions.size >= effectiveTotal) {
                logger.info(
                    { roomCode: session.roomCode, effectiveTotal },
                    "All active participants submitted — auto-finalizing AI request",
                );
                executeFinalize(session.roomCode, reqSession, roomAgg);
            }
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

            executeFinalize(session.roomCode, reqSession, roomAgg);
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

            // 非ホスト参加者に AI リクエスト終了を通知（generating 状態から復帰させる）
            const cancelledPayload: AIRequestCancelledPayload = {
                message: "ホストが AI 提案を採用しました",
                reason: "adopted",
            };
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_CANCELLED, cancelledPayload);

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
    // ai-request:discard — ホストが AI 提案結果を破棄
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_DISCARD, () => {
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
                    message: "ホストのみが AI 提案を破棄できます",
                } satisfies RoomErrorPayload);
                return;
            }

            // AI リクエストセッションをクリーンアップ
            aiRequestSessions.delete(session.roomCode);

            // 全参加者に AI リクエスト終了を通知（generating 状態から復帰させる）
            const payload: AIRequestCancelledPayload = {
                message: "ホストが AI 提案を破棄しました",
                reason: "discarded",
            };
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_CANCELLED, payload);

            logger.info({ roomCode: session.roomCode }, "AI suggestion discarded by host");
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

    // ----------------------------------------------------------
    // ai-request:dismiss — 非ホスト参加者がモーダルを閉じてオプトアウト
    // ----------------------------------------------------------
    socket.on(C2S_EVENTS.AI_REQUEST_DISMISS, () => {
        try {
            const session = socketSessions.get(socket.id);
            if (!session) return;

            const reqSession = aiRequestSessions.get(session.roomCode);
            if (!reqSession || !reqSession.active) return;

            // 既に送信済みの場合は dismiss 不可（送信は取り消せない）
            if (reqSession.submissions.has(session.participantId)) return;

            reqSession.dismissed.add(session.participantId);

            // 有効参加者数を再計算してブロードキャスト
            const room = roomRepo.findByCode(session.roomCode);
            if (!room) return;
            const roomAgg = RoomAggregate.fromRoom(room);
            const connectedCount = roomAgg.getConnectedParticipants().length;
            const effectiveTotal = connectedCount - reqSession.dismissed.size;

            const status: AIRequestStatusPayload = {
                submittedCount: reqSession.submissions.size,
                totalParticipants: effectiveTotal,
            };
            io.to(session.roomCode).emit(S2C_EVENTS.AI_REQUEST_STATUS, status);

            logger.info(
                {
                    roomCode: session.roomCode,
                    participantId: session.participantId,
                    effectiveTotal,
                },
                "AI request dismissed (opted out)",
            );

            // dismiss 後、残り全員が送信済みなら自動 finalize
            if (effectiveTotal > 0 && reqSession.submissions.size >= effectiveTotal) {
                logger.info(
                    { roomCode: session.roomCode, effectiveTotal },
                    "All active participants submitted after dismiss — auto-finalizing AI request",
                );
                executeFinalize(session.roomCode, reqSession, roomAgg);
            }
        } catch (error) {
            emitError(socket, error);
        }
    });

    // ----------------------------------------------------------
    // executeFinalize — 収集を打ち切り AI 生成を実行する共通ヘルパー
    //
    // finalize ハンドラ（ホスト手動）と submit ハンドラ（全員送信時の自動）
    // の両方から呼び出される。ホストの socketId は roomAgg から逆引きする。
    // ----------------------------------------------------------
    function executeFinalize(
        roomCode: string,
        reqSession: AIRequestSession,
        roomAgg: RoomAggregate,
    ): void {
        // 既に finalize 済み・キャンセル済みの場合は重複実行を防止
        if (!reqSession.active && !aiRequestSessions.has(roomCode)) return;

        // 収集を終了
        reqSession.active = false;
        timerService.cancel(`ai-request:${roomCode}`);

        const requests = Array.from(reqSession.submissions.values());
        const currentFields = roomAgg.profileFields;

        // 全員に「生成中」を通知（クライアントのモーダル切り替え用）
        io.to(roomCode).emit(S2C_EVENTS.AI_REQUEST_GENERATING, {});

        // ホストの socketId を逆引き（結果送信用）
        const hostParticipant = roomAgg.getConnectedParticipants().find((p) => p.isHost);
        let hostSocketId: string | undefined;
        if (hostParticipant) {
            for (const [sid, sess] of socketSessions.entries()) {
                if (sess.roomCode === roomCode && sess.participantId === hostParticipant.id) {
                    hostSocketId = sid;
                    break;
                }
            }
        }

        // AI 生成（非同期）
        void (async () => {
            try {
                const suggestedFields = await fieldSuggester.suggest(requests, currentFields);

                // キャンセル済みの場合は結果を送信しない（状態の不一致を防ぐ）
                if (reqSession.cancelled) {
                    logger.info({ roomCode }, "AI suggestion completed but session was cancelled — discarding result");
                    return;
                }

                const result: AIRequestResultPayload = { suggestedFields };
                // ホストにのみ結果を送信（ホストが採用判断する）
                if (hostSocketId) {
                    io.to(hostSocketId).emit(S2C_EVENTS.AI_REQUEST_RESULT, result);
                }

                logger.info(
                    {
                        roomCode,
                        requestCount: requests.length,
                        suggestedFieldCount: suggestedFields.length,
                    },
                    "AI field suggestion completed",
                );
            } catch (error) {
                // キャンセル済みの場合はエラーも通知しない
                if (reqSession.cancelled) {
                    logger.info({ roomCode }, "AI suggestion failed but session was already cancelled");
                    return;
                }

                if (hostSocketId) {
                    io.to(hostSocketId).emit(S2C_EVENTS.ROOM_ERROR, {
                        code: "AI_REQUEST_FAILED",
                        message: "AI による項目提案に失敗しました。もう一度お試しください。",
                    } satisfies RoomErrorPayload);
                }

                logger.error(
                    {
                        roomCode,
                        error: error instanceof Error ? error.message : String(error),
                    },
                    "AI field suggestion failed",
                );
            } finally {
                // セッションをクリーンアップ（キャンセル時は既に削除済みなので冪等に処理）
                aiRequestSessions.delete(roomCode);
            }
        })();
    }
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
