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
    AnimationThemeName,
    InvitationReceivedPayload,
} from "@self-intro-quiz/shared";
import { DEFAULT_PROFILE_FIELDS, DEFAULT_ANIMATION_THEME } from "@self-intro-quiz/shared";

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
    animationTheme: AnimationThemeName;
    roomName: string;

    // AI リクエスト状態
    aiRequestState: AIRequestState;
    aiRequestExpiresAt: number | null;
    aiRequestSubmittedCount: number;
    aiRequestTotalParticipants: number;
    aiRequestSuggestedFields: ProfileFieldDefinition[] | null;
    /** 非ホストがモーダルを閉じてオプトアウトしたかどうか */
    aiRequestOptedOut: boolean;

    // プロフィール再入力要求
    profileInvalidated: boolean;

    // 自分の送信済みプロフィール（ロビー復帰時の復元用）
    myProfile: Record<string, string> | null;

    // 受信した招待
    receivedInvitations: InvitationReceivedPayload[];

    // アクション
    setConnected: (connected: boolean) => void;
    setCredentials: (roomCode: string, nickname: string) => void;
    setRoomState: (participantId: string, state: RoomStateSync) => void;
    updateParticipants: (participants: ParticipantInfo[]) => void;
    setPhase: (phase: RoomPhase) => void;
    setHost: (isHost: boolean) => void;
    setProfileFields: (fields: ProfileFieldDefinition[], profilesInvalidated: boolean) => void;
    setMyProfile: (profile: Record<string, string> | null) => void;
    setAnimationTheme: (theme: AnimationThemeName) => void;
    setRoomName: (roomName: string) => void;
    setAIRequestState: (state: AIRequestState) => void;
    setAIRequestStarted: (expiresAt: number, totalParticipants: number) => void;
    setAIRequestStatus: (submittedCount: number, totalParticipants: number) => void;
    setAIRequestResult: (fields: ProfileFieldDefinition[]) => void;
    setAIRequestOptedOut: (optedOut: boolean) => void;
    resetAIRequest: () => void;
    clearProfileInvalidated: () => void;
    addInvitation: (invitation: InvitationReceivedPayload) => void;
    dismissInvitation: (index: number) => void;
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
    animationTheme: DEFAULT_ANIMATION_THEME as AnimationThemeName,
    roomName: "",
    aiRequestState: "idle" as AIRequestState,
    aiRequestExpiresAt: null as number | null,
    aiRequestSubmittedCount: 0,
    aiRequestTotalParticipants: 0,
    aiRequestSuggestedFields: null as ProfileFieldDefinition[] | null,
    aiRequestOptedOut: false,
    profileInvalidated: false,
    myProfile: null as Record<string, string> | null,
    receivedInvitations: [] as InvitationReceivedPayload[],
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
            animationTheme: state.room.animationTheme,
            roomName: state.room.roomName,
            myProfile: state.self.profile ?? null,
        }),

    updateParticipants: (participants) => set({ participants }),

    setPhase: (phase) => set({ phase }),

    setHost: (isHost) => set({ isHost }),

    setProfileFields: (fields, profilesInvalidated) =>
        set((state) => ({
            profileFields: fields,
            profileInvalidated: profilesInvalidated,
            ...(profilesInvalidated
                ? {
                    myProfile: null,
                    participants: state.participants.map((p) => ({ ...p, hasProfile: false })),
                }
                : {}),
        })),

    setMyProfile: (profile) => set({ myProfile: profile }),

    setAnimationTheme: (theme) => set({ animationTheme: theme }),

    setRoomName: (roomName) => set({ roomName }),

    setAIRequestState: (aiRequestState) => set({ aiRequestState }),

    setAIRequestStarted: (expiresAt, totalParticipants) =>
        set({
            aiRequestState: "collecting",
            aiRequestExpiresAt: expiresAt,
            aiRequestSubmittedCount: 0,
            aiRequestTotalParticipants: totalParticipants,
            aiRequestSuggestedFields: null,
            aiRequestOptedOut: false,
        }),

    setAIRequestStatus: (submittedCount, totalParticipants) =>
        set({ aiRequestSubmittedCount: submittedCount, aiRequestTotalParticipants: totalParticipants }),

    setAIRequestResult: (fields) =>
        set({
            aiRequestState: "result",
            aiRequestSuggestedFields: fields,
        }),

    setAIRequestOptedOut: (optedOut) => set({ aiRequestOptedOut: optedOut }),

    resetAIRequest: () =>
        set({
            aiRequestState: "idle",
            aiRequestExpiresAt: null,
            aiRequestSubmittedCount: 0,
            aiRequestTotalParticipants: 0,
            aiRequestSuggestedFields: null,
            aiRequestOptedOut: false,
        }),

    clearProfileInvalidated: () => set({ profileInvalidated: false }),

    addInvitation: (invitation) =>
        set((state) => ({
            receivedInvitations: [...state.receivedInvitations, invitation],
        })),

    dismissInvitation: (index) =>
        set((state) => ({
            receivedInvitations: state.receivedInvitations.filter((_, i) => i !== index),
        })),

    reset: () => set(initialState),
}));
