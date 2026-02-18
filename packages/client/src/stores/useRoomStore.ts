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
} from "@self-intro-quiz/shared";

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

    // アクション
    setConnected: (connected: boolean) => void;
    setCredentials: (roomCode: string, nickname: string) => void;
    setRoomState: (participantId: string, state: RoomStateSync) => void;
    updateParticipants: (participants: ParticipantInfo[]) => void;
    setPhase: (phase: RoomPhase) => void;
    setHost: (isHost: boolean) => void;
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
        }),

    updateParticipants: (participants) => set({ participants }),

    setPhase: (phase) => set({ phase }),

    setHost: (isHost) => set({ isHost }),

    reset: () => set(initialState),
}));
