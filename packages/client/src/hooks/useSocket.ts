/**
 * useSocket — Socket.IO イベントのリスナー管理 Hook
 *
 * Server → Client イベントを受信し、Zustand ストアに反映する。
 * 接続・切断・再接続のライフサイクルも管理。
 */

import { useEffect } from "react";
import { socket } from "../lib/socket.js";
import { S2C_EVENTS } from "@self-intro-quiz/shared";
import type {
    RoomCreatedPayload,
    RoomJoinedPayload,
    ParticipantJoinedPayload,
    ParticipantLeftPayload,
    HostChangedPayload,
    ProfileUpdatedPayload,
    QuestionStartPayload,
    AnswerCountPayload,
    QuestionRevealPayload,
    QuizFinishedPayload,
    RoomErrorPayload,
} from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { useNavigate } from "react-router";

/**
 * Socket.IO イベントリスナーをセットアップする。
 * App コンポーネントのトップレベルで1回だけ呼ぶ。
 */
export function useSocket(): void {
    const navigate = useNavigate();

    useEffect(() => {
        // 接続状態の管理
        const onConnect = () => {
            useRoomStore.getState().setConnected(true);

            // 再接続時に room:join を再送信
            const { roomCode, nickname } = useRoomStore.getState();
            if (roomCode && nickname) {
                socket.emit("room:join", { roomCode, nickname });
            }
        };

        const onDisconnect = () => {
            useRoomStore.getState().setConnected(false);
        };

        // Room イベント
        const onRoomCreated = (payload: RoomCreatedPayload) => {
            const store = useRoomStore.getState();
            store.setRoomState(payload.participantId, payload.roomState);
            navigate(`/room/${payload.roomCode}`);
        };

        const onRoomJoined = (payload: RoomJoinedPayload) => {
            const store = useRoomStore.getState();
            store.setRoomState(payload.participantId, payload.roomState);
            const roomCode = payload.roomState.room.code;
            navigate(`/room/${roomCode}`);
        };

        const onParticipantJoined = (payload: ParticipantJoinedPayload) => {
            // participants の更新は RoomStateSync ではなく個別イベントで処理
            const { participants } = useRoomStore.getState();
            const updated = [...participants];

            // 既存の参加者リストに追加（簡易版）
            if (!updated.some((p) => p.nickname === payload.nickname)) {
                updated.push({
                    nickname: payload.nickname,
                    score: 0,
                    answeredCount: 0,
                    totalQuestions: 0,
                    isHost: payload.isHost,
                    isConnected: true,
                    hasProfile: false,
                });
            } else {
                // 再接続の場合、isConnected を true に
                const idx = updated.findIndex((p) => p.nickname === payload.nickname);
                if (idx !== -1 && updated[idx]) {
                    updated[idx] = { ...updated[idx], isConnected: true };
                }
            }

            useRoomStore.getState().updateParticipants(updated);
        };

        const onParticipantLeft = (payload: ParticipantLeftPayload) => {
            const { participants } = useRoomStore.getState();
            const updated = participants.map((p) =>
                p.nickname === payload.nickname ? { ...p, isConnected: false } : p,
            );
            useRoomStore.getState().updateParticipants(updated);
        };

        const onHostChanged = (payload: HostChangedPayload) => {
            const { participants, participantId } = useRoomStore.getState();
            const updated = participants.map((p) => ({
                ...p,
                isHost: p.nickname === payload.newHostNickname,
            }));
            useRoomStore.getState().updateParticipants(updated);

            // 自分が新しい Host になったか
            if (participantId === payload.newHostId) {
                useRoomStore.getState().setHost(true);
            }
        };

        const onProfileUpdated = (payload: ProfileUpdatedPayload) => {
            const { participants } = useRoomStore.getState();
            const updated = participants.map((p) =>
                p.nickname === payload.nickname ? { ...p, hasProfile: true } : p,
            );
            useRoomStore.getState().updateParticipants(updated);
        };

        const onRoomClosed = () => {
            useRoomStore.getState().reset();
            useQuizStore.getState().reset();
            navigate("/");
        };

        // Quiz イベント
        const onQuizGenerating = () => {
            useQuizStore.getState().setGenerating();
            useRoomStore.getState().setPhase("generating");
        };

        const onQuizReady = () => {
            useQuizStore.getState().setReady();
        };

        const onQuizGenerateFailed = (payload: { message: string }) => {
            useQuizStore.getState().setGenerateError(payload.message);
            useRoomStore.getState().setPhase("lobby");
        };

        const onQuestionStart = (payload: QuestionStartPayload) => {
            useQuizStore.getState().setQuestion(payload);
            useRoomStore.getState().setPhase("playing");
        };

        const onAnswerCount = (payload: AnswerCountPayload) => {
            useQuizStore.getState().setAnswerCount(payload.answeredCount, payload.totalParticipants);
        };

        const onQuestionReveal = (payload: QuestionRevealPayload) => {
            useQuizStore.getState().setReveal(payload);
            useRoomStore.getState().setPhase("revealing");
        };

        const onQuizFinished = (payload: QuizFinishedPayload) => {
            useQuizStore.getState().setFinished(payload.finalScores);
            useRoomStore.getState().setPhase("finished");
        };

        const onError = (payload: RoomErrorPayload) => {
            // ROOM_NOT_FOUND はトップ画面に戻す
            if (payload.code === "ROOM_NOT_FOUND") {
                useRoomStore.getState().reset();
                useQuizStore.getState().reset();
                navigate("/");
            }
            // NICKNAME_TAKEN / ROOM_FULL 等の参加エラーは JoinRoomPage のローカルリスナーで
            // UI 表示を処理する。ここではログ出力のみ。
            // TODO: Toast 通知を実装すれば、RoomPage 内でのエラーも視覚的に通知可能
            console.error(`[room:error] ${payload.code}: ${payload.message}`);
        };

        // リスナー登録
        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on(S2C_EVENTS.ROOM_CREATED, onRoomCreated);
        socket.on(S2C_EVENTS.ROOM_JOINED, onRoomJoined);
        socket.on(S2C_EVENTS.ROOM_PARTICIPANT_JOINED, onParticipantJoined);
        socket.on(S2C_EVENTS.ROOM_PARTICIPANT_LEFT, onParticipantLeft);
        socket.on(S2C_EVENTS.ROOM_HOST_CHANGED, onHostChanged);
        socket.on(S2C_EVENTS.PROFILE_UPDATED, onProfileUpdated);
        socket.on(S2C_EVENTS.ROOM_CLOSED, onRoomClosed);
        socket.on(S2C_EVENTS.QUIZ_GENERATING, onQuizGenerating);
        socket.on(S2C_EVENTS.QUIZ_READY, onQuizReady);
        socket.on(S2C_EVENTS.QUIZ_GENERATE_FAILED, onQuizGenerateFailed);
        socket.on(S2C_EVENTS.QUESTION_START, onQuestionStart);
        socket.on(S2C_EVENTS.QUESTION_ANSWER_COUNT, onAnswerCount);
        socket.on(S2C_EVENTS.QUESTION_REVEAL, onQuestionReveal);
        socket.on(S2C_EVENTS.QUIZ_FINISHED, onQuizFinished);
        socket.on(S2C_EVENTS.ROOM_ERROR, onError);

        // クリーンアップ
        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off(S2C_EVENTS.ROOM_CREATED, onRoomCreated);
            socket.off(S2C_EVENTS.ROOM_JOINED, onRoomJoined);
            socket.off(S2C_EVENTS.ROOM_PARTICIPANT_JOINED, onParticipantJoined);
            socket.off(S2C_EVENTS.ROOM_PARTICIPANT_LEFT, onParticipantLeft);
            socket.off(S2C_EVENTS.ROOM_HOST_CHANGED, onHostChanged);
            socket.off(S2C_EVENTS.PROFILE_UPDATED, onProfileUpdated);
            socket.off(S2C_EVENTS.ROOM_CLOSED, onRoomClosed);
            socket.off(S2C_EVENTS.QUIZ_GENERATING, onQuizGenerating);
            socket.off(S2C_EVENTS.QUIZ_READY, onQuizReady);
            socket.off(S2C_EVENTS.QUIZ_GENERATE_FAILED, onQuizGenerateFailed);
            socket.off(S2C_EVENTS.QUESTION_START, onQuestionStart);
            socket.off(S2C_EVENTS.QUESTION_ANSWER_COUNT, onAnswerCount);
            socket.off(S2C_EVENTS.QUESTION_REVEAL, onQuestionReveal);
            socket.off(S2C_EVENTS.QUIZ_FINISHED, onQuizFinished);
            socket.off(S2C_EVENTS.ROOM_ERROR, onError);
        };
    }, [navigate]);
}
