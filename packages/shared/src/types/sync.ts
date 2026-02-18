/**
 * Sync — クライアントへの状態同期ペイロード型定義
 *
 * Socket.IO イベントで送受信するペイロードの型。
 * RoomStateSync はルーム参加時・再接続時にクライアントへ送信する全状態スナップショット。
 */

import type { RoomPhase } from "./room.js";
import type { ProfileFieldDefinition } from "./profile.js";
import type { ScoreEntry } from "./quiz.js";

// ============================================================
// RoomStateSync — 全状態スナップショット
// ============================================================

/**
 * クライアントに送信するルーム全状態。
 * room:created / room:joined イベントのペイロードに含まれる。
 */
export interface RoomStateSync {
    room: {
        code: string;
        phase: RoomPhase;
        /** -1 = 未開始 */
        currentQuestionIndex: number;
        /** 固定値 10 */
        totalQuestions: number;
        /** ホストがカスタマイズしたプロフィール入力項目 */
        profileFields: ProfileFieldDefinition[];
    };
    participants: ParticipantInfo[];
    /** playing/revealing 中のみ */
    currentQuestion?: CurrentQuestionInfo;
    /** revealing 中のみ */
    revealedAnswer?: RevealedAnswerInfo;
    /** リクエストした参加者自身の情報 */
    self: SelfInfo;
}

// ============================================================
// サブ型定義
// ============================================================

/** クライアント向け参加者情報（socketId 等のサーバ内部情報は含まない） */
export interface ParticipantInfo {
    nickname: string;
    score: number;
    answeredCount: number;
    totalQuestions: number;
    isHost: boolean;
    isConnected: boolean;
    hasProfile: boolean;
}

/** 出題中の問題情報（正解は含まない） */
export interface CurrentQuestionInfo {
    index: number;
    text: string;
    choices: string[];
    timerEndsAt: number;
    answeredCount: number;
    totalParticipants: number;
    /** 回答済み参加者のニックネーム一覧（再接続時の状態復元用） */
    answeredNicknames: string[];
}

/** 正解発表情報 */
export interface RevealedAnswerInfo {
    correctIndex: number;
    explanation: string;
    scores: ScoreEntry[];
}

/** 自分自身の情報 */
export interface SelfInfo {
    participantId: string;
    nickname: string;
    isHost: boolean;
    joinedAtQuestion: number;
}

// ============================================================
// Server → Client イベントペイロード
// ============================================================

/** room:created ペイロード */
export interface RoomCreatedPayload {
    roomCode: string;
    participantId: string;
    roomState: RoomStateSync;
}

/** room:joined ペイロード */
export interface RoomJoinedPayload {
    participantId: string;
    roomState: RoomStateSync;
}

/** room:participant-joined ペイロード */
export interface ParticipantJoinedPayload {
    nickname: string;
    isHost: boolean;
    participantCount: number;
}

/** room:participant-left ペイロード */
export interface ParticipantLeftPayload {
    nickname: string;
    participantCount: number;
    /**
     * true の場合、参加者はルームから完全に削除された（明示的退出 or 切断タイムアウト）。
     * false / undefined の場合、一時的な切断（グレー表示、再接続可能）。
     */
    removed?: boolean;
}

/** room:host-changed ペイロード */
export interface HostChangedPayload {
    newHostNickname: string;
    newHostId: string;
}

/** profile:updated ペイロード */
export interface ProfileUpdatedPayload {
    nickname: string;
    profileSubmittedCount: number;
    totalParticipants: number;
}

/** quiz:generating ペイロード */
export interface QuizGeneratingPayload {
    message: string;
}

/** quiz:ready ペイロード */
export interface QuizReadyPayload {
    totalQuestions: number;
}

/** quiz:generate-failed ペイロード */
export interface QuizGenerateFailedPayload {
    message: string;
}

/** question:start ペイロード */
export interface QuestionStartPayload {
    index: number;
    text: string;
    choices: string[];
    timerEndsAt: number;
    totalParticipants: number;
}

/** question:answer-count ペイロード */
export interface AnswerCountPayload {
    answeredCount: number;
    totalParticipants: number;
    /** 回答済み参加者のニックネーム一覧 */
    answeredNicknames: string[];
}

/** question:reveal ペイロード */
export interface QuestionRevealPayload {
    questionIndex: number;
    correctIndex: number;
    explanation: string;
    scores: ScoreEntry[];
}

/** quiz:finished ペイロード */
export interface QuizFinishedPayload {
    finalScores: ScoreEntry[];
}

/** room:error ペイロード */
export interface RoomErrorPayload {
    code: string;
    message: string;
}

// ============================================================
// Client → Server イベントペイロード
// ============================================================

/** room:create ペイロード */
export interface CreateRoomPayload {
    nickname: string;
    /** ブラウザ単位の一意識別子（マルチタブ重複防止用） */
    clientId?: string;
}

/** room:join ペイロード */
export interface JoinRoomPayload {
    roomCode: string;
    nickname: string;
    /** ブラウザ単位の一意識別子（マルチタブ重複防止用） */
    clientId?: string;
}

/** profile:submit ペイロード */
export interface SubmitProfilePayload {
    profile: Record<string, string>;
}

/** question:answer ペイロード */
export interface SubmitAnswerPayload {
    questionIndex: number;
    choiceIndex: number;
}

// ============================================================
// ルーム一覧（Join ページ用）
// ============================================================

/** ルーム一覧に表示するサマリー情報 */
export interface RoomSummaryParticipant {
    nickname: string;
    isConnected: boolean;
}

/** ルーム一覧の1件分のサマリー */
export interface RoomSummary {
    code: string;
    phase: RoomPhase;
    hostNickname: string;
    participants: RoomSummaryParticipant[];
    participantCount: number;
    maxParticipants: number;
    createdAt: number;
}

/** room:list ペイロード */
export interface RoomListPayload {
    rooms: RoomSummary[];
}

// ニックネーム重複チェック
export interface CheckNicknamePayload {
    roomCode: string;
    nickname: string;
}

export interface NicknameResultPayload {
    available: boolean;
    roomCode: string;
    nickname: string;
    /** available: false の理由。ルーム不在 or ニックネーム重複 */
    reason?: "ROOM_NOT_FOUND" | "NICKNAME_TAKEN";
}

// ============================================================
// fields:update イベントペイロード
// ============================================================

/** fields:update (C2S) ペイロード */
export interface UpdateFieldsPayload {
    fields: ProfileFieldDefinition[];
}

/** fields:updated (S2C) ペイロード */
export interface FieldsUpdatedPayload {
    fields: ProfileFieldDefinition[];
    /** true の場合、プロフィールがリセットされたため再入力が必要 */
    profilesInvalidated: boolean;
}

// ============================================================
// AI リクエストイベントペイロード
// ============================================================

/** ai-request:started (S2C) ペイロード — ホストが AI リクエストを発動したことを通知 */
export interface AIRequestStartedPayload {
    message: string;
    /** 受付終了時刻 (Unix timestamp ms) */
    expiresAt: number;
}

/** ai-request:submit (C2S) ペイロード — 参加者のリクエスト投稿 */
export interface AIRequestSubmitPayload {
    presets: string[];
    freeText: string;
}

/** ai-request:finalize (C2S) ペイロード — ホストがリクエスト受付を終了しAI生成開始 */
export interface AIRequestFinalizePayload {
    /** 空オブジェクト（今後オプション追加可） */
}

/** ai-request:status (S2C) ペイロード — リクエスト収集状況 */
export interface AIRequestStatusPayload {
    submittedCount: number;
    totalParticipants: number;
}

/** ai-request:result (S2C) ペイロード — AI が提案したプロフィール項目 */
export interface AIRequestResultPayload {
    suggestedFields: ProfileFieldDefinition[];
}

/** ai-request:adopt (C2S) ペイロード — ホストが AI 提案を採用 */
export interface AIRequestAdoptPayload {
    fields: ProfileFieldDefinition[];
}

/** ai-request:cancelled (S2C) ペイロード — ホストが AI リクエストをキャンセル */
export interface AIRequestCancelledPayload {
    message: string;
}
