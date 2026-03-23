/**
 * subtle テーマ — 控えめ（デフォルト）
 *
 * 上品な fade と gentle scale で落ち着いた雰囲気。
 * アニメーション嫌いな参加者にも受け入れやすいミニマルな演出。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { SpotlightEffect } from "../effects/SpotlightEffect.js";

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
        textPrimary: "text-slate-800",
        textSecondary: "text-slate-500",
        textAccent: "text-indigo-600",
        explanationBg: "bg-blue-50",
        explanationText: "text-blue-900",
        highlightGradient: "from-indigo-50 to-purple-50",
        inputField: "bg-white border-gray-300 text-slate-800 placeholder:text-slate-400",
        inputFocus: "focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200",
        labelText: "text-slate-700",
        surfaceMuted: "bg-gray-50",
        badgeSuccess: "bg-green-100 text-green-700",
        badgeError: "bg-red-100 text-red-700",
        badgeWarning: "bg-yellow-100 text-yellow-700",
        badgeMuted: "bg-gray-100 text-gray-400",
        buttonDanger: "border-red-300 text-red-600 hover:bg-red-50",
        buttonGhost: "border-gray-300 text-gray-600 hover:bg-gray-50",
        modalBg: "bg-white",
        choiceIndexBadge: "bg-indigo-600",
        participantOnline: "bg-green-400",
        participantOffline: "bg-gray-400",
        statusOk: "text-green-500",
        chipSelected: "bg-indigo-600 text-white",
        chipDefault: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        spinner: "border-indigo-200 border-t-indigo-600",
        progressIndicator: "bg-indigo-50 text-indigo-700",
        linkText: "text-indigo-600",
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
    effects: {
        onInterview: (name: string) => createElement(SpotlightEffect, {
            subjectName: name,
            config: {
                color: "rgba(99, 102, 241, 0.5)",
                glowColor: "rgba(129, 140, 248, 0.2)",
                overlayColor: "rgba(15, 23, 42, 0.65)",
                nameColor: "text-white",
                nameGlow: "0 0 30px rgba(129,140,248,0.7), 0 0 60px rgba(99,102,241,0.4)",
                badgeClass: "bg-indigo-500",
                decorEmojis: ["✨", "🎤", "💬"],
                decorCount: 8,
                style: "soft" as const,
            },
        }),
    },
    rootClassName: "theme-subtle",
};
