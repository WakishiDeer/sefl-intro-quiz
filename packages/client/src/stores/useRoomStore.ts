/**
 * useRoomStore — Room 状態の Zustand ストア
 *
 * Socket.IO から受信した Room の状態を一元管理する。
 * 再接続時は RoomStateSync で全状態を復元する。
 */

import { create } from "zustand";
import type {
    RoomPhase,
    ParticipantInfo,
    RoomStateSync,
    ProfileFieldDefinition,
} from "@self-intro-quiz/shared";
import { DEFAULT_PROFILE_FIELDS } from "@self-intro-quiz/shared";

/** AI リクエストの状態 */
type AIRequestState = "idle" | "collecting" | "generating" | "result";

interface RoomState {
    // 接続状態
    isConnected: boolean;
    participantId: string | null;
    roomCode: string | null;
    nickname: string | null;

    // Room 状態
    phase: RoomPhase | null;
    participants: ParticipantInfo[];
    isHost: boolean;
    joinedAtQuestion: number;
    profileFields: ProfileFieldDefinition[];

    // AI リクエスト状態
    aiRequestState: AIRequestState;
    aiRequestExpiresAt: number | null;
    aiRequestSubmittedCount: number;
    aiRequestTotalParticipants: number;
    aiRequestSuggestedFields: ProfileFieldDefinition[] | null;

    // プロフィール再入力要求
    profileInvalidated: boolean;

    // アクション
    setConnected: (connected: boolean) => void;
    setCredentials: (roomCode: string, nickname: string) => void;
    setRoomState: (participantId: string, state: RoomStateSync) => void;
    updateParticipants: (participants: ParticipantInfo[]) => void;
    setPhase: (phase: RoomPhase) => void;
    setHost: (isHost: boolean) => void;
    setProfileFields: (fields: ProfileFieldDefinition[], profilesInvalidated: boolean) => void;
    setAIRequestState: (state: AIRequestState) => void;
    setAIRequestStarted: (expiresAt: number) => void;
    setAIRequestStatus: (submittedCount: number, totalParticipants: number) => void;
    setAIRequestResult: (fields: ProfileFieldDefinition[]) => void;
    resetAIRequest: () => void;
    clearProfileInvalidated: () => void;
    reset: () => void;
}

const initialState = {
    isConnected: false,
    participantId: null,
    roomCode: null,
    nickname: null,
    phase: null,
    participants: [],
    isHost: false,
    joinedAtQuestion: -1,
    profileFields: DEFAULT_PROFILE_FIELDS as ProfileFieldDefinition[],
    aiRequestState: "idle" as AIRequestState,
    aiRequestExpiresAt: null as number | null,
    aiRequestSubmittedCount: 0,
    aiRequestTotalParticipants: 0,
    aiRequestSuggestedFields: null as ProfileFieldDefinition[] | null,
    profileInvalidated: false,
};

export const useRoomStore = create<RoomState>((set) => ({
    ...initialState,

    setConnected: (connected) => set({ isConnected: connected }),

    setCredentials: (roomCode, nickname) => set({ roomCode, nickname }),

    setRoomState: (participantId, state) =>
        set({
            participantId,
            roomCode: state.room.code,
            phase: state.room.phase,
            participants: state.participants,
            isHost: state.self.isHost,
            nickname: state.self.nickname,
            joinedAtQuestion: state.self.joinedAtQuestion,
            profileFields: state.room.profileFields,
        }),

    updateParticipants: (participants) => set({ participants }),

    setPhase: (phase) => set({ phase }),

    setHost: (isHost) => set({ isHost }),

    setProfileFields: (fields, profilesInvalidated) =>
        set({
            profileFields: fields,
            profileInvalidated: profilesInvalidated,
        }),

    setAIRequestState: (aiRequestState) => set({ aiRequestState }),

    setAIRequestStarted: (expiresAt) =>
        set({
            aiRequestState: "collecting",
            aiRequestExpiresAt: expiresAt,
            aiRequestSubmittedCount: 0,
            aiRequestSuggestedFields: null,
        }),

    setAIRequestStatus: (submittedCount, totalParticipants) =>
        set({ aiRequestSubmittedCount: submittedCount, aiRequestTotalParticipants: totalParticipants }),

    setAIRequestResult: (fields) =>
        set({
            aiRequestState: "result",
            aiRequestSuggestedFields: fields,
        }),

    resetAIRequest: () =>
        set({
            aiRequestState: "idle",
            aiRequestExpiresAt: null,
            aiRequestSubmittedCount: 0,
            aiRequestTotalParticipants: 0,
            aiRequestSuggestedFields: null,
        }),

    clearProfileInvalidated: () => set({ profileInvalidated: false }),

    reset: () => set(initialState),
}));
