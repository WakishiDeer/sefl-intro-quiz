/**
 * events.ts — Socket.IO イベント名の定数定義
 *
 * クライアント・サーバ間で使用するイベント名を一元管理し、タイポを防止する。
 */

// ============================================================
// Client → Server イベント
// ============================================================

export const C2S_EVENTS = {
    ROOM_CREATE: "room:create",
    ROOM_JOIN: "room:join",
    ROOM_LEAVE: "room:leave",
    ROOM_CLOSE: "room:close",
    ROOM_BACK_TO_LOBBY: "room:back-to-lobby",
    ROOM_LIST_SUBSCRIBE: "room:list-subscribe",
    ROOM_LIST_UNSUBSCRIBE: "room:list-unsubscribe",
    ROOM_CHECK_NICKNAME: "room:check-nickname",
    PROFILE_SUBMIT: "profile:submit",
    FIELDS_UPDATE: "fields:update",
    QUIZ_GENERATE: "quiz:generate",
    QUIZ_NEXT_QUESTION: "quiz:next-question",
    QUESTION_ANSWER: "question:answer",
    AI_REQUEST_START: "ai-request:start",
    AI_REQUEST_SUBMIT: "ai-request:submit",
    AI_REQUEST_FINALIZE: "ai-request:finalize",
    AI_REQUEST_ADOPT: "ai-request:adopt",
    AI_REQUEST_CANCEL: "ai-request:cancel",
} as const;

// ============================================================
// Server → Client イベント
// ============================================================

export const S2C_EVENTS = {
    ROOM_CREATED: "room:created",
    ROOM_JOINED: "room:joined",
    ROOM_CLOSED: "room:closed",
    ROOM_BACK_TO_LOBBY: "room:back-to-lobby",
    ROOM_ERROR: "room:error",
    ROOM_LIST: "room:list",
    ROOM_NICKNAME_RESULT: "room:nickname-result",
    ROOM_PARTICIPANT_JOINED: "room:participant-joined",
    ROOM_PARTICIPANT_LEFT: "room:participant-left",
    ROOM_HOST_CHANGED: "room:host-changed",
    PROFILE_UPDATED: "profile:updated",
    FIELDS_UPDATED: "fields:updated",
    QUIZ_GENERATING: "quiz:generating",
    QUIZ_READY: "quiz:ready",
    QUIZ_GENERATE_FAILED: "quiz:generate-failed",
    QUESTION_START: "question:start",
    QUESTION_ANSWER_COUNT: "question:answer-count",
    QUESTION_REVEAL: "question:reveal",
    QUIZ_FINISHED: "quiz:finished",
    AI_REQUEST_STARTED: "ai-request:started",
    AI_REQUEST_STATUS: "ai-request:status",
    AI_REQUEST_RESULT: "ai-request:result",
    AI_REQUEST_CANCELLED: "ai-request:cancelled",
    AI_REQUEST_GENERATING: "ai-request:generating",
} as const;

// ============================================================
// 型ユーティリティ
// ============================================================

/** Client → Server イベント名のユニオン型 */
export type C2SEventName = (typeof C2S_EVENTS)[keyof typeof C2S_EVENTS];

/** Server → Client イベント名のユニオン型 */
export type S2CEventName = (typeof S2C_EVENTS)[keyof typeof S2C_EVENTS];
