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
    RoomStateSync,
    ScoreEntry,
    FieldsUpdatedPayload,
    InterviewStartPayload,
    AIRequestStartedPayload,
    AIRequestStatusPayload,
    AIRequestResultPayload,
    AIRequestCancelledPayload,
    InvitationReceivedPayload,
    ReactionReceivedPayload,
    ParticipantKickedPayload,
    RoomNameChangedPayload,
} from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { useToastStore } from "../stores/useToastStore.js";
import { useReactionStore } from "../stores/useReactionStore.js";
import { saveSession, clearSession, getOrCreateClientId } from "../lib/sessionPersistence.js";
import { useNavigate } from "react-router";

/**
 * Socket.IO イベントリスナーをセットアップする。
 * App コンポーネントのトップレベルで1回だけ呼ぶ。
 */
export function useSocket(): void {
    const navigate = useNavigate();

    useEffect(() => {
        /**
         * RoomStateSync からクイズ状態を復元する。
         *
         * 再接続・途中参加時、room:joined の RoomStateSync には
         * 現在の問題・正解情報が含まれるが、quiz ストアは空のまま。
         * このヘルパーで quiz ストアに反映し、QuizView の「問題を読み込み中...」固まりを防ぐ。
         *
         * 正常なクイズフロー（question:start / question:reveal イベント）は
         * 別のイベントハンドラで処理されるため、干渉しない。
         */
        const restoreQuizState = (roomState: RoomStateSync) => {
            const quizStore = useQuizStore.getState();
            const { phase } = roomState.room;
            const { currentQuestion, revealedAnswer } = roomState;

            // サーバから通知された総問題数を復元
            if (roomState.room.totalQuestions > 0) {
                quizStore.setReady(roomState.room.totalQuestions);
            }

            if (phase === "playing" || phase === "revealing" || phase === "interviewing") {
                if (currentQuestion) {
                    // 問題情報を復元（CurrentQuestionInfo は QuestionStartPayload のスーパーセット）
                    quizStore.setQuestion(currentQuestion);
                    // setQuestion は answeredCount を 0 にリセットするため、実際の値で上書き
                    quizStore.setAnswerCount(
                        currentQuestion.answeredCount,
                        currentQuestion.totalParticipants,
                        currentQuestion.answeredNicknames ?? [],
                    );
                }

                if (revealedAnswer && (phase === "revealing" || phase === "interviewing") && currentQuestion) {
                    // 正解発表情報を復元
                    quizStore.setReveal({
                        questionIndex: currentQuestion.index,
                        ...revealedAnswer,
                    });
                }

                // interviewing 中はインタビュー対象者情報も復元
                if (phase === "interviewing" && roomState.interviewSpeech) {
                    quizStore.setInterview({
                        subjectNickname: roomState.interviewSpeech.subjectNickname,
                        speechEndsAt: roomState.interviewSpeech.speechEndsAt,
                    });
                }

                // revealing 中は「気になる」投票状態を復元
                if (phase === "revealing" && roomState.hasVotedCurious) {
                    quizStore.setVotedCurious();
                }
            } else if (phase === "generating") {
                quizStore.setGenerating();
            } else if (phase === "finished") {
                // 終了状態を復元
                // revealedAnswer.scores があればそのまま使い、なければ participants から構築
                const finalScores: ScoreEntry[] = roomState.revealedAnswer
                    ? roomState.revealedAnswer.scores
                    : roomState.participants
                        .map((p, i) => ({
                            nickname: p.nickname,
                            score: p.score,
                            correctCount: Math.round(p.score / 100),
                            answeredCount: p.answeredCount,
                            totalQuestions: p.totalQuestions,
                            isLateJoiner: false,
                            maxStreak: 0,
                            rank: i + 1,
                        }))
                        .sort((a, b) => b.score - a.score)
                        .map((entry, i) => ({ ...entry, rank: i + 1 }));
                quizStore.setFinished(finalScores);
            }
        };

        // 接続状態の管理
        const onConnect = () => {
            useRoomStore.getState().setConnected(true);

            // 同一タブ内のネットワーク復帰（Socket.IO の自動再接続）の場合のみ
            // room:join を自動送信する。Zustand にデータがあれば同一タブ内。
            // リロード・新タブの場合は Zustand が空なので、RoomPage の claim フローに委譲する。
            const { roomCode, nickname } = useRoomStore.getState();
            if (roomCode && nickname) {
                socket.emit("room:join", { roomCode, nickname, clientId: getOrCreateClientId() });
            }
        };

        const onDisconnect = () => {
            useRoomStore.getState().setConnected(false);
        };

        // Room イベント
        const onRoomCreated = (payload: RoomCreatedPayload) => {
            const store = useRoomStore.getState();
            store.setRoomState(payload.participantId, payload.roomState);
            saveSession({ roomCode: payload.roomCode, nickname: payload.roomState.self.nickname });
            navigate(`/room/${payload.roomCode}`);
        };

        const onRoomJoined = (payload: RoomJoinedPayload) => {
            const store = useRoomStore.getState();
            store.setRoomState(payload.participantId, payload.roomState);
            const roomCode = payload.roomState.room.code;
            saveSession({ roomCode, nickname: payload.roomState.self.nickname });

            // 再接続・途中参加時にクイズ状態を RoomStateSync から復元
            restoreQuizState(payload.roomState);

            navigate(`/room/${roomCode}`);
        };

        const onParticipantJoined = (payload: ParticipantJoinedPayload) => {
            // participants の更新は RoomStateSync ではなく個別イベントで処理
            const { participants } = useRoomStore.getState();
            const updated = [...participants];

            // 既存の参加者リストに追加（簡易版）
            if (!updated.some((p) => p.nickname === payload.nickname)) {
                updated.push({
                    participantId: "",
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
            if (payload.removed) {
                // 明示的退出 or 切断タイムアウト → 参加者を一覧から完全削除
                const updated = participants.filter((p) => p.nickname !== payload.nickname);
                useRoomStore.getState().updateParticipants(updated);
            } else {
                // 一時切断 → グレー表示（再接続の可能性あり）
                const updated = participants.map((p) =>
                    p.nickname === payload.nickname ? { ...p, isConnected: false } : p,
                );
                useRoomStore.getState().updateParticipants(updated);
            }
        };

        const onHostChanged = (payload: HostChangedPayload) => {
            const { participants, participantId } = useRoomStore.getState();
            const updated = participants.map((p) => ({
                ...p,
                isHost: p.nickname === payload.newHostNickname,
            }));
            useRoomStore.getState().updateParticipants(updated);

            // 自分が新しい Host になったか
            const isNewHost = participantId === payload.newHostId;
            if (isNewHost) {
                useRoomStore.getState().setHost(true);
                useToastStore.getState().showToast("あなたが新しいホストになりました");
            } else {
                useToastStore.getState().showToast(`${payload.newHostNickname} さんが新しいホストになりました`);
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
            clearSession();
            useRoomStore.getState().reset();
            useQuizStore.getState().reset();
            navigate("/");
        };

        const onParticipantKicked = (_payload: ParticipantKickedPayload) => {
            clearSession();
            useRoomStore.getState().reset();
            useQuizStore.getState().reset();
            useToastStore.getState().showToast("ホストによりルームから除外されました");
            navigate("/");
        };

        // フィールド更新イベント
        const onFieldsUpdated = (payload: FieldsUpdatedPayload) => {
            useRoomStore.getState().setProfileFields(
                payload.fields,
                payload.profilesInvalidated,
            );
        };

        // AI リクエストイベント
        const onAIRequestStarted = (payload: AIRequestStartedPayload) => {
            useRoomStore.getState().setAIRequestStarted(payload.expiresAt, payload.totalParticipants);
        };

        const onAIRequestStatus = (payload: AIRequestStatusPayload) => {
            useRoomStore.getState().setAIRequestStatus(
                payload.submittedCount,
                payload.totalParticipants,
            );
        };

        const onAIRequestResult = (payload: AIRequestResultPayload) => {
            useRoomStore.getState().setAIRequestResult(payload.suggestedFields);
        };

        const onAIRequestCancelled = (payload: AIRequestCancelledPayload) => {
            useRoomStore.getState().resetAIRequest();
            if (payload.reason === "discarded") {
                useToastStore.getState().showToast("AI 提案が破棄されました");
            } else if (payload.reason === "cancelled") {
                useToastStore.getState().showToast("AI リクエストがキャンセルされました");
            }
        };

        const onAIRequestGenerating = () => {
            useRoomStore.getState().setAIRequestState("generating");
        };

        // アニメーションテーマ変更
        const onThemeChanged = (payload: { theme: string }) => {
            useRoomStore.getState().setAnimationTheme(payload.theme as import("@self-intro-quiz/shared").AnimationThemeName);
        };

        // ルーム名変更
        const onRoomNameChanged = (payload: RoomNameChangedPayload) => {
            useRoomStore.getState().setRoomName(payload.roomName);
        };

        // ルーム招待受信
        const onInvitationReceived = (payload: InvitationReceivedPayload) => {
            useRoomStore.getState().addInvitation(payload);
        };

        // リアクション受信
        const onReactionReceived = (payload: ReactionReceivedPayload) => {
            useReactionStore.getState().addParticle({
                display: payload.display,
                type: payload.type,
                senderNickname: payload.senderNickname,
                ...(payload.mono ? { mono: true } : {}),
            });
        };

        // ロビー復帰: クイズ終了後にロビーに戻る
        const onBackToLobby = (payload: RoomStateSync) => {
            // クイズ状態をリセット
            useQuizStore.getState().reset();
            // RoomStateSync でルーム状態を全更新
            const store = useRoomStore.getState();
            const participantId = store.participantId;
            if (participantId) {
                store.setRoomState(participantId, payload);
            }
        };

        // Quiz イベント
        const onQuizGenerating = () => {
            useQuizStore.getState().setGenerating();
            useRoomStore.getState().setPhase("generating");
        };

        const onQuizReady = (payload: { totalQuestions: number }) => {
            useQuizStore.getState().setReady(payload.totalQuestions);
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
            useQuizStore.getState().setAnswerCount(
                payload.answeredCount,
                payload.totalParticipants,
                payload.answeredNicknames ?? [],
            );
        };

        const onQuestionReveal = (payload: QuestionRevealPayload) => {
            useQuizStore.getState().setReveal(payload);
            useRoomStore.getState().setPhase("revealing");
        };

        const onInterviewStart = (payload: InterviewStartPayload) => {
            useQuizStore.getState().setInterview(payload);
            useRoomStore.getState().setPhase("interviewing");
        };

        const onQuizFinished = (payload: QuizFinishedPayload) => {
            useQuizStore.getState().setFinished(payload.finalScores, payload.highlights, payload.questionResults);
            useRoomStore.getState().setPhase("finished");
        };

        const onError = (payload: RoomErrorPayload) => {
            // ROOM_NOT_FOUND はトップ画面に戻す
            if (payload.code === "ROOM_NOT_FOUND") {
                clearSession();
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
        socket.on(S2C_EVENTS.FIELDS_UPDATED, onFieldsUpdated);
        socket.on(S2C_EVENTS.ROOM_CLOSED, onRoomClosed);
        socket.on(S2C_EVENTS.ROOM_PARTICIPANT_KICKED, onParticipantKicked);
        socket.on(S2C_EVENTS.ROOM_BACK_TO_LOBBY, onBackToLobby);
        socket.on(S2C_EVENTS.AI_REQUEST_STARTED, onAIRequestStarted);
        socket.on(S2C_EVENTS.AI_REQUEST_STATUS, onAIRequestStatus);
        socket.on(S2C_EVENTS.AI_REQUEST_RESULT, onAIRequestResult);
        socket.on(S2C_EVENTS.AI_REQUEST_CANCELLED, onAIRequestCancelled);
        socket.on(S2C_EVENTS.AI_REQUEST_GENERATING, onAIRequestGenerating);
        socket.on(S2C_EVENTS.ROOM_THEME_CHANGED, onThemeChanged);
        socket.on(S2C_EVENTS.ROOM_NAME_CHANGED, onRoomNameChanged);
        socket.on(S2C_EVENTS.ROOM_INVITATION, onInvitationReceived);
        socket.on(S2C_EVENTS.REACTION_RECEIVED, onReactionReceived);
        socket.on(S2C_EVENTS.QUIZ_GENERATING, onQuizGenerating);
        socket.on(S2C_EVENTS.QUIZ_READY, onQuizReady);
        socket.on(S2C_EVENTS.QUIZ_GENERATE_FAILED, onQuizGenerateFailed);
        socket.on(S2C_EVENTS.QUESTION_START, onQuestionStart);
        socket.on(S2C_EVENTS.QUESTION_ANSWER_COUNT, onAnswerCount);
        socket.on(S2C_EVENTS.QUESTION_REVEAL, onQuestionReveal);
        socket.on(S2C_EVENTS.INTERVIEW_START, onInterviewStart);
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
            socket.off(S2C_EVENTS.FIELDS_UPDATED, onFieldsUpdated);
            socket.off(S2C_EVENTS.ROOM_CLOSED, onRoomClosed);
            socket.off(S2C_EVENTS.ROOM_PARTICIPANT_KICKED, onParticipantKicked);
            socket.off(S2C_EVENTS.ROOM_BACK_TO_LOBBY, onBackToLobby);
            socket.off(S2C_EVENTS.AI_REQUEST_STARTED, onAIRequestStarted);
            socket.off(S2C_EVENTS.AI_REQUEST_STATUS, onAIRequestStatus);
            socket.off(S2C_EVENTS.AI_REQUEST_RESULT, onAIRequestResult);
            socket.off(S2C_EVENTS.AI_REQUEST_CANCELLED, onAIRequestCancelled);
            socket.off(S2C_EVENTS.AI_REQUEST_GENERATING, onAIRequestGenerating);
            socket.off(S2C_EVENTS.ROOM_THEME_CHANGED, onThemeChanged);
            socket.off(S2C_EVENTS.ROOM_NAME_CHANGED, onRoomNameChanged);
            socket.off(S2C_EVENTS.ROOM_INVITATION, onInvitationReceived);
            socket.off(S2C_EVENTS.REACTION_RECEIVED, onReactionReceived);
            socket.off(S2C_EVENTS.QUIZ_GENERATING, onQuizGenerating);
            socket.off(S2C_EVENTS.QUIZ_READY, onQuizReady);
            socket.off(S2C_EVENTS.QUIZ_GENERATE_FAILED, onQuizGenerateFailed);
            socket.off(S2C_EVENTS.QUESTION_START, onQuestionStart);
            socket.off(S2C_EVENTS.QUESTION_ANSWER_COUNT, onAnswerCount);
            socket.off(S2C_EVENTS.QUESTION_REVEAL, onQuestionReveal);
            socket.off(S2C_EVENTS.INTERVIEW_START, onInterviewStart);
            socket.off(S2C_EVENTS.QUIZ_FINISHED, onQuizFinished);
            socket.off(S2C_EVENTS.ROOM_ERROR, onError);
        };
    }, [navigate]);
}
