/**
 * subtle テーマ — 控えめ（デフォルト）
 *
 * 上品な fade と gentle scale で落ち着いた雰囲気。
 * アニメーション嫌いな参加者にも受け入れやすいミニマルな演出。
 */

import type { AnimationThemeConfig } from "../types.js";

export const subtleTheme: AnimationThemeConfig = {
    name: "subtle",
    colors: {
        bgGradient: "from-slate-50 to-slate-100",
        cardBg: "bg-white",
        cardBorder: "border-gray-200",
        buttonPrimary: "bg-indigo-600",
        buttonPrimaryHover: "hover:bg-indigo-700",
        buttonAccent: "bg-amber-400",
        buttonAccentHover: "hover:bg-amber-500",
        textPrimary: "text-gray-900",
        textSecondary: "text-gray-500",
        textAccent: "text-indigo-600",
        explanationBg: "bg-blue-50",
        explanationText: "text-blue-900",
        highlightGradient: "from-indigo-50 to-purple-50",
    },
    variants: {
        questionEntry: {
            initial: { opacity: 0, y: 8 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
        },
        questionExit: {
            exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: "easeIn" } },
        },
        choiceEntry: {
            initial: { opacity: 0, y: 6 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                transition: { duration: 0.3, delay: i * 0.06, ease: "easeOut" },
            }),
        },
        correctReveal: {
            initial: { scale: 1 },
            animate: {
                scale: [1, 1.04, 1.02],
                transition: { duration: 0.4, ease: "easeOut" },
            },
        },
        wrongReveal: {
            initial: { x: 0 },
            animate: {
                x: [0, -3, 3, -2, 1, 0],
                transition: { duration: 0.35, ease: "easeOut" },
            },
        },
        scoreUpdate: {
            initial: { scale: 1 },
            animate: {
                scale: [1, 1.05, 1],
                transition: { duration: 0.3 },
            },
        },
        phaseTransition: {
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
            exit: { opacity: 0, transition: { duration: 0.25, ease: "easeIn" } },
        },
        resultEntry: {
            initial: { opacity: 0, y: 12 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
            }),
        },
        participantJoin: {
            initial: { opacity: 0, x: -8 },
            animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } },
        },
    },
    effects: {},
    rootClassName: "theme-subtle",
};
