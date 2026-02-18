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
} from "@self-intro-quiz/shared";

interface QuizState {
    // 現在の問題
    currentQuestion: QuestionStartPayload | null;
    timerEndsAt: number | null;
    myAnswer: number | null;
    answeredCount: number;
    totalParticipants: number;

    // 正解発表
    revealedAnswer: QuestionRevealPayload | null;

    // スコアボード
    scores: ScoreEntry[];

    // 最終結果
    isFinished: boolean;
    finalScores: ScoreEntry[];

    // クイズ生成状態
    isGenerating: boolean;
    isReady: boolean;
    generateError: string | null;

    // アクション
    setQuestion: (q: QuestionStartPayload) => void;
    setMyAnswer: (choiceIndex: number) => void;
    setAnswerCount: (count: number, total: number) => void;
    setReveal: (reveal: QuestionRevealPayload) => void;
    setFinished: (finalScores: ScoreEntry[]) => void;
    setGenerating: () => void;
    setReady: () => void;
    setGenerateError: (message: string) => void;
    reset: () => void;
}

const initialState = {
    currentQuestion: null,
    timerEndsAt: null,
    myAnswer: null,
    answeredCount: 0,
    totalParticipants: 0,
    revealedAnswer: null,
    scores: [],
    isFinished: false,
    finalScores: [],
    isGenerating: false,
    isReady: false,
    generateError: null,
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
            revealedAnswer: null,
        }),

    setMyAnswer: (choiceIndex) => set({ myAnswer: choiceIndex }),

    setAnswerCount: (count, total) =>
        set({ answeredCount: count, totalParticipants: total }),

    setReveal: (reveal) =>
        set({
            revealedAnswer: reveal,
            scores: reveal.scores,
            timerEndsAt: null,
        }),

    setFinished: (finalScores) =>
        set({
            isFinished: true,
            finalScores,
            currentQuestion: null,
            revealedAnswer: null,
            timerEndsAt: null,
        }),

    setGenerating: () =>
        set({ isGenerating: true, isReady: false, generateError: null }),

    setReady: () =>
        set({ isGenerating: false, isReady: true, generateError: null }),

    setGenerateError: (message) =>
        set({ isGenerating: false, isReady: false, generateError: message }),

    reset: () => set(initialState),
}));
