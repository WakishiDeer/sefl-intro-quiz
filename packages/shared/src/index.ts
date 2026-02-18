/**
 * @self-intro-quiz/shared — 共有パッケージのバレルエクスポート
 *
 * 型定義・定数・バリデーションスキーマ・イベント名を一元管理。
 * server / client 両方がこのパッケージに依存する。
 */

// 型定義
export type {
    Profile,
    RoomPhase,
    Participant,
    Room,
    Question,
    Answer,
    ScoreEntry,
    Quiz,
    RoomStateSync,
    ParticipantInfo,
    CurrentQuestionInfo,
    RevealedAnswerInfo,
    SelfInfo,
    RoomCreatedPayload,
    RoomJoinedPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    HostChangedPayload,
    ProfileUpdatedPayload,
    QuizGeneratingPayload,
    QuizReadyPayload,
    QuizGenerateFailedPayload,
    QuestionStartPayload,
    AnswerCountPayload,
    QuestionRevealPayload,
    QuizFinishedPayload,
    RoomErrorPayload,
    CreateRoomPayload,
    JoinRoomPayload,
    SubmitProfilePayload,
    SubmitAnswerPayload,
    RoomSummary,
    RoomSummaryParticipant,
    RoomListPayload,
} from "./types/index.js";

// 定数
export {
    MAX_PARTICIPANTS,
    DEFAULT_MIN_PARTICIPANTS,
    ROOM_CODE_LENGTH,
    ROOM_CODE_CHARSET,
    DEFAULT_ROOM_TIMEOUT_MS,
    ROOM_CLEANUP_INTERVAL_MS,
    HOST_RECONNECT_GRACE_MS,
    TOTAL_QUESTIONS,
    DEFAULT_QUESTION_TIME_LIMIT_MS,
    MAX_CHOICES,
    SCORE_PER_CORRECT,
    MAX_PROFILE_FIELD_LENGTH,
    PROFILE_FIELDS,
    MIN_NICKNAME_LENGTH,
    MAX_NICKNAME_LENGTH,
    AI_MAX_TOKENS,
    AI_MAX_RETRIES,
    AI_RETRY_BASE_DELAY_MS,
    RATE_LIMIT_JOIN_PER_MIN,
    RATE_LIMIT_HTTP_PER_MIN,
    RATE_LIMIT_WINDOW_MS,
} from "./constants.js";

// イベント名
export {
    C2S_EVENTS,
    S2C_EVENTS,
} from "./events.js";
export type { C2SEventName, S2CEventName } from "./events.js";

// バリデーションスキーマ
export {
    NicknameSchema,
    RoomCodeSchema,
    ProfileFieldSchema,
    ProfileSchema,
    CreateRoomSchema,
    JoinRoomSchema,
    SubmitProfileSchema,
    SubmitAnswerSchema,
    AIQuestionSchema,
    AIOutputSchema,
} from "./validation.js";
export type {
    NicknameInput,
    RoomCodeInput,
    ProfileInput,
    CreateRoomInput,
    JoinRoomInput,
    SubmitProfileInput,
    SubmitAnswerInput,
    AIQuestionOutput,
    AIOutput,
} from "./validation.js";
