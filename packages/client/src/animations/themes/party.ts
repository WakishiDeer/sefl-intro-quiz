/**
 * party テーマ — ネオンナイト / ディスコパーティー
 *
 * ロイヤルパープル × ゴールドのカラースキームで夜のパーティー感を演出。
 * 常時ディスコボール風ライトビーム + ダイヤモンド反射が浮遊。
 * 正解時は花火バーストが画面を彩る。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { FireworksBurst } from "../effects/FireworksBurst.js";
import { PartyLights } from "../effects/PartyLights.js";
import { SpotlightEffect } from "../effects/SpotlightEffect.js";

export const partyTheme: AnimationThemeConfig = {
    name: "party",
    colors: {
        bgGradient: "from-violet-400/80 via-purple-300/70 to-amber-200/80",
        cardBg: "bg-white/80 backdrop-blur-sm",
        cardBorder: "border-violet-400",
        buttonPrimary: "bg-violet-600 shadow-lg shadow-violet-400/50",
        buttonPrimaryHover: "hover:bg-violet-700 hover:shadow-violet-500/60",
        buttonAccent: "bg-amber-500 shadow-lg shadow-amber-400/50",
        buttonAccentHover: "hover:bg-amber-600",
        textPrimary: "text-violet-950",
        textSecondary: "text-violet-600",
        textAccent: "text-amber-600",
        explanationBg: "bg-violet-100/80 backdrop-blur-sm",
        explanationText: "text-violet-900",
        highlightGradient: "from-violet-100 to-amber-100",
        inputField: "bg-white/80 border-violet-300 text-violet-950 placeholder:text-violet-300",
        inputFocus: "focus:border-violet-500 focus:ring-1 focus:ring-violet-200",
        labelText: "text-violet-800",
        surfaceMuted: "bg-violet-50/60",
        badgeSuccess: "bg-green-100 text-green-700",
        badgeError: "bg-red-100 text-red-700",
        badgeWarning: "bg-yellow-100 text-yellow-700",
        badgeMuted: "bg-gray-100 text-gray-400",
        buttonDanger: "border-red-300 text-red-600 hover:bg-red-50",
        buttonGhost: "border-violet-300 text-violet-600 hover:bg-violet-50",
        modalBg: "bg-white/90 backdrop-blur-sm",
        choiceIndexBadge: "bg-violet-600",
        participantOnline: "bg-green-400",
        participantOffline: "bg-gray-400",
        statusOk: "text-green-500",
        chipSelected: "bg-violet-600 text-white",
        chipDefault: "bg-violet-50 text-violet-700 hover:bg-violet-100",
        spinner: "border-violet-200 border-t-violet-600",
        progressIndicator: "bg-violet-50 text-violet-700",
        linkText: "text-violet-600",
    },
    variants: {
        questionEntry: {
            initial: { opacity: 0, scale: 0.7, rotate: -5 },
            animate: {
                opacity: 1,
                scale: 1,
                rotate: 0,
                transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
        questionExit: {
            exit: {
                opacity: 0,
                scale: 0.8,
                rotate: 3,
                transition: { duration: 0.3, ease: "easeIn" },
            },
        },
        choiceEntry: {
            initial: { opacity: 0, scale: 0.5, y: 40, rotate: -3 },
            animate: (i: number) => ({
                opacity: 1,
                scale: 1,
                y: 0,
                rotate: 0,
                transition: {
                    duration: 0.55,
                    delay: i * 0.12,
                    ease: [0.34, 1.56, 0.64, 1],
                },
            }),
        },
        correctReveal: {
            initial: { scale: 1, rotate: 0 },
            animate: {
                scale: [1, 1.2, 0.92, 1.1, 0.98, 1.03],
                rotate: [0, -4, 4, -2, 1, 0],
                transition: { duration: 0.7, ease: "easeOut" },
            },
        },
        wrongReveal: {
            initial: { x: 0, rotate: 0 },
            animate: {
                x: [0, -12, 12, -10, 8, -4, 0],
                rotate: [0, -4, 4, -2, 2, -1, 0],
                transition: { duration: 0.6, ease: "easeOut" },
            },
        },
        scoreUpdate: {
            initial: { scale: 1, y: 0, rotate: 0 },
            animate: {
                scale: [1, 1.35, 0.9, 1.15, 1],
                y: [0, -12, 4, -5, 0],
                rotate: [0, -3, 3, -1, 0],
                transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
        phaseTransition: {
            initial: { opacity: 0, scale: 0.9, rotate: -2 },
            animate: {
                opacity: 1,
                scale: 1,
                rotate: 0,
                transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
            },
            exit: {
                opacity: 0,
                scale: 0.9,
                rotate: 2,
                transition: { duration: 0.25, ease: "easeIn" },
            },
        },
        resultEntry: {
            initial: { opacity: 0, scale: 0.5, y: 60, rotate: -5 },
            animate: (i: number) => ({
                opacity: 1,
                scale: 1,
                y: 0,
                rotate: 0,
                transition: {
                    duration: 0.8,
                    delay: i * 0.18,
                    ease: [0.34, 1.56, 0.64, 1],
                },
            }),
        },
        participantJoin: {
            initial: { opacity: 0, scale: 0.7, x: -20 },
            animate: {
                opacity: 1,
                scale: 1,
                x: 0,
                transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
    },
    effects: {
        onCorrect: () => createElement(FireworksBurst),
        ambient: () => createElement(PartyLights),
        onInterview: (name: string) => createElement(SpotlightEffect, {
            subjectName: name,
            config: {
                color: "rgba(139, 92, 246, 0.65)",
                glowColor: "rgba(251, 191, 36, 0.35)",
                overlayColor: "rgba(20, 0, 40, 0.6)",
                nameColor: "text-white",
                nameGlow: "0 0 30px rgba(251,191,36,0.8), 0 0 60px rgba(139,92,246,0.5), 0 0 90px rgba(168,85,247,0.3)",
                badgeClass: "bg-violet-500",
                decorEmojis: ["🎉", "🎊", "🎤", "💃", "🕺", "🪩", "🔥"],
                decorCount: 18,
                style: "beam" as const,
            },
        }),
        timerUrgencyClass: "party-timer-urgent",
    },
    rootClassName: "theme-party",
};
