/**
 * types/index.ts — 型定義のバレルエクスポート
 */

export type { Profile } from "./profile.js";

export type {
    RoomPhase,
    Participant,
    Room,
} from "./room.js";

export type {
    Question,
    Answer,
    ScoreEntry,
    Quiz,
} from "./quiz.js";

export type {
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
    CheckNicknamePayload,
    NicknameResultPayload,
} from "./sync.js";
