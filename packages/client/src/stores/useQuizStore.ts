/**
 * useQuizStore — Quiz 状態の Zustand ストア
 *
 * クイズ進行中の問題・回答・スコアを一元管理する。
 */

import { create } from "zustand";
import type {
    QuestionStartPayload,
    QuestionRevealPayload,
    ScoreEntry,
    QuizHighlight,
    InterviewStartPayload,
    ParticipantAnswerResult,
    QuestionResultSummary,
} from "@self-intro-quiz/shared";

interface QuizState {
    // 現在の問題
    currentQuestion: QuestionStartPayload | null;
    timerEndsAt: number | null;
    myAnswer: number | null;
    answeredCount: number;
    totalParticipants: number;
    /** 現在の問題に回答済みの参加者ニックネーム一覧 */
    answeredNicknames: string[];

    // 正解発表
    revealedAnswer: QuestionRevealPayload | null;
    /** 現在の問題の参加者回答結果 */
    participantResults: ParticipantAnswerResult[];

    // スコアボード
    scores: ScoreEntry[];

    // 「気になる」投票
    hasVotedCurious: boolean;

    // インタビュー（スピーチ）タイム
    interviewSpeech: InterviewStartPayload | null;

    // 最終結果
    isFinished: boolean;
    finalScores: ScoreEntry[];
    highlights: QuizHighlight[];
    /** 全問題の回答結果サマリー */
    questionResults: QuestionResultSummary[];

    // クイズ生成状態
    isGenerating: boolean;
    isReady: boolean;
    generateError: string | null;
    /** サーバから通知された総問題数 */
    totalQuestions: number;

    // アクション
    setQuestion: (q: QuestionStartPayload) => void;
    setMyAnswer: (choiceIndex: number) => void;
    setAnswerCount: (count: number, total: number, nicknames: string[]) => void;
    setReveal: (reveal: QuestionRevealPayload) => void;
    setVotedCurious: () => void;
    setInterview: (payload: InterviewStartPayload) => void;
    setFinished: (finalScores: ScoreEntry[], highlights?: QuizHighlight[], questionResults?: QuestionResultSummary[]) => void;
    setGenerating: () => void;
    setReady: (totalQuestions: number) => void;
    setGenerateError: (message: string) => void;
    reset: () => void;
}

const initialState = {
    currentQuestion: null,
    timerEndsAt: null,
    myAnswer: null,
    answeredCount: 0,
    totalParticipants: 0,
    answeredNicknames: [],
    revealedAnswer: null,
    participantResults: [],
    scores: [],
    hasVotedCurious: false,
    interviewSpeech: null,
    isFinished: false,
    finalScores: [],
    highlights: [],
    questionResults: [],
    isGenerating: false,
    isReady: false,
    generateError: null,
    totalQuestions: 0,
};

export const useQuizStore = create<QuizState>((set) => ({
    ...initialState,

    setQuestion: (q) =>
        set({
            currentQuestion: q,
            timerEndsAt: q.timerEndsAt,
            myAnswer: null,
            answeredCount: 0,
            totalParticipants: q.totalParticipants,
            answeredNicknames: [],
            revealedAnswer: null,
            hasVotedCurious: false,
            interviewSpeech: null,
        }),

    setMyAnswer: (choiceIndex) => set({ myAnswer: choiceIndex }),

    setAnswerCount: (count, total, nicknames) =>
        set({ answeredCount: count, totalParticipants: total, answeredNicknames: nicknames }),

    setReveal: (reveal) =>
        set({
            revealedAnswer: reveal,
            scores: reveal.scores,
            participantResults: reveal.participantResults ?? [],
            timerEndsAt: null,
        }),

    setVotedCurious: () => set({ hasVotedCurious: true }),

    setInterview: (payload) =>
        set({
            interviewSpeech: payload,
            timerEndsAt: null,
        }),

    setFinished: (finalScores, highlights, questionResults) =>
        set({
            isFinished: true,
            finalScores,
            highlights: highlights ?? [],
            questionResults: questionResults ?? [],
            currentQuestion: null,
            revealedAnswer: null,
            timerEndsAt: null,
        }),

    setGenerating: () =>
        set({ isGenerating: true, isReady: false, generateError: null }),

    setReady: (totalQuestions) =>
        set({ isGenerating: false, isReady: true, generateError: null, totalQuestions }),

    setGenerateError: (message) =>
        set({ isGenerating: false, isReady: false, generateError: message }),

    reset: () => set(initialState),
}));
