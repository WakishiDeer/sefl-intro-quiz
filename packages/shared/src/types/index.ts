/**
 * types/index.ts — 型定義のバレルエクスポート
 */

export type { Profile, ProfileFieldDefinition, ProfileFieldPreset, ProfileFieldPresetId } from "./profile.js";

export type {
    RoomPhase,
    AnimationThemeName,
    Participant,
    Room,
} from "./room.js";

export type {
    QuestionType,
    Question,
    Answer,
    ScoreEntry,
    QuizHighlight,
    ParticipantAnswerResult,
    QuestionResultSummary,
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
    UpdateFieldsPayload,
    FieldsUpdatedPayload,
    InterviewSpeechInfo,
    InterviewStartPayload,
    VoteCuriousPayload,
    AIRequestStartedPayload,
    AIRequestSubmitPayload,
    AIRequestFinalizePayload,
    AIRequestStatusPayload,
    AIRequestResultPayload,
    AIRequestAdoptPayload,
    AIRequestCancelledPayload,
    SendInvitePayload,
    InvitationReceivedPayload,
} from "./sync.js";
