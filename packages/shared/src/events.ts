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
    ROOM_LIST_SUBSCRIBE: "room:list-subscribe",
    ROOM_LIST_UNSUBSCRIBE: "room:list-unsubscribe",
    ROOM_CHECK_NICKNAME: "room:check-nickname",
    PROFILE_SUBMIT: "profile:submit",
    QUIZ_GENERATE: "quiz:generate",
    QUIZ_NEXT_QUESTION: "quiz:next-question",
    QUESTION_ANSWER: "question:answer",
} as const;

// ============================================================
// Server → Client イベント
// ============================================================

export const S2C_EVENTS = {
    ROOM_CREATED: "room:created",
    ROOM_JOINED: "room:joined",
    ROOM_CLOSED: "room:closed",
    ROOM_ERROR: "room:error",
    ROOM_LIST: "room:list",
    ROOM_NICKNAME_RESULT: "room:nickname-result",
    ROOM_PARTICIPANT_JOINED: "room:participant-joined",
    ROOM_PARTICIPANT_LEFT: "room:participant-left",
    ROOM_HOST_CHANGED: "room:host-changed",
    PROFILE_UPDATED: "profile:updated",
    QUIZ_GENERATING: "quiz:generating",
    QUIZ_READY: "quiz:ready",
    QUIZ_GENERATE_FAILED: "quiz:generate-failed",
    QUESTION_START: "question:start",
    QUESTION_ANSWER_COUNT: "question:answer-count",
    QUESTION_REVEAL: "question:reveal",
    QUIZ_FINISHED: "quiz:finished",
} as const;

// ============================================================
// 型ユーティリティ
// ============================================================

/** Client → Server イベント名のユニオン型 */
export type C2SEventName = (typeof C2S_EVENTS)[keyof typeof C2S_EVENTS];

/** Server → Client イベント名のユニオン型 */
export type S2CEventName = (typeof S2C_EVENTS)[keyof typeof S2C_EVENTS];
