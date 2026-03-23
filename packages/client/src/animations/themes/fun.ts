/**
 * fun テーマ — ポップ & カラフル
 *
 * ライムグリーン × スカイブルーのネオポップ配色。
 * bounce でクイズ番組っぽいワクワク感。
 * 正解時にカラフルなスターバースト + お祝いテキスト、
 * 常時カラフルなバブルがふわふわ上昇する背景アニメーション。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { PopCelebration } from "../effects/PopCelebration.js";
import { PopBubbles } from "../effects/PopBubbles.js";
import { SpotlightEffect } from "../effects/SpotlightEffect.js";

export const funTheme: AnimationThemeConfig = {
    name: "fun",
    colors: {
        bgGradient: "from-lime-200 via-emerald-100 to-sky-200",
        cardBg: "bg-white/80 backdrop-blur-sm",
        cardBorder: "border-lime-300",
        buttonPrimary: "bg-emerald-500 shadow-lg shadow-emerald-300/50",
        buttonPrimaryHover: "hover:bg-emerald-600 hover:shadow-emerald-400/60",
        buttonAccent: "bg-sky-500 shadow-lg shadow-sky-300/50",
        buttonAccentHover: "hover:bg-sky-600",
        textPrimary: "text-emerald-900",
        textSecondary: "text-sky-600",
        textAccent: "text-lime-600",
        explanationBg: "bg-lime-100/80 backdrop-blur-sm",
        explanationText: "text-emerald-800",
        highlightGradient: "from-lime-100 to-sky-100",
        inputField: "bg-white/80 border-lime-300 text-emerald-900 placeholder:text-emerald-400",
        inputFocus: "focus:border-emerald-500 focus:ring-1 focus:ring-lime-200",
        labelText: "text-sky-700",
        surfaceMuted: "bg-lime-50/60",
        badgeSuccess: "bg-green-100 text-green-700",
        badgeError: "bg-red-100 text-red-700",
        badgeWarning: "bg-yellow-100 text-yellow-700",
        badgeMuted: "bg-gray-100 text-gray-400",
        buttonDanger: "border-red-300 text-red-600 hover:bg-red-50",
        buttonGhost: "border-lime-300 text-emerald-700 hover:bg-lime-50",
        modalBg: "bg-white/90 backdrop-blur-sm",
        choiceIndexBadge: "bg-sky-500",
        participantOnline: "bg-green-400",
        participantOffline: "bg-gray-400",
        statusOk: "text-green-500",
        chipSelected: "bg-emerald-500 text-white",
        chipDefault: "bg-lime-50 text-emerald-700 hover:bg-lime-100",
        spinner: "border-lime-200 border-t-emerald-600",
        progressIndicator: "bg-lime-50 text-emerald-700",
        linkText: "text-sky-600",
    },
    variants: {
        questionEntry: {
            initial: { opacity: 0, y: 50, scale: 0.85, rotate: -3 },
            animate: {
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: 0,
                transition: { duration: 0.6, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
        questionExit: {
            exit: {
                opacity: 0,
                y: -20,
                scale: 0.95,
                transition: { duration: 0.3, ease: "easeIn" },
            },
        },
        choiceEntry: {
            initial: { opacity: 0, y: 30, scale: 0.8, rotate: -2 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: 0,
                transition: {
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.34, 1.56, 0.64, 1],
                },
            }),
        },
        correctReveal: {
            initial: { scale: 1, rotate: 0 },
            animate: {
                scale: [1, 1.15, 0.95, 1.08, 1],
                rotate: [0, -3, 3, -1, 0],
                transition: { duration: 0.6, ease: "easeOut" },
            },
        },
        wrongReveal: {
            initial: { x: 0, opacity: 1 },
            animate: {
                x: [0, -6, 6, -4, 3, 0],
                opacity: [1, 1, 1, 1, 0.7, 0.5],
                transition: { duration: 0.4, ease: "easeOut" },
            },
        },
        scoreUpdate: {
            initial: { scale: 1, y: 0 },
            animate: {
                scale: [1, 1.3, 0.95, 1.1, 1],
                y: [0, -8, 2, -3, 0],
                transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
        phaseTransition: {
            initial: { opacity: 0, scale: 0.96 },
            animate: {
                opacity: 1,
                scale: 1,
                transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] },
            },
            exit: {
                opacity: 0,
                scale: 0.96,
                transition: { duration: 0.25, ease: "easeIn" },
            },
        },
        resultEntry: {
            initial: { opacity: 0, y: 50, scale: 0.8, rotate: -2 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                scale: 1,
                rotate: 0,
                transition: {
                    duration: 0.7,
                    delay: i * 0.15,
                    ease: [0.34, 1.56, 0.64, 1],
                },
            }),
        },
        participantJoin: {
            initial: { opacity: 0, x: -16, scale: 0.9 },
            animate: {
                opacity: 1,
                x: 0,
                scale: 1,
                transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] },
            },
        },
    },
    effects: {
        onCorrect: () => createElement(PopCelebration),
        ambient: () => createElement(PopBubbles),
        onInterview: (name: string) => createElement(SpotlightEffect, {
            subjectName: name,
            config: {
                color: "rgba(132, 204, 22, 0.55)",
                glowColor: "rgba(34, 197, 94, 0.25)",
                overlayColor: "rgba(5, 20, 0, 0.65)",
                nameColor: "text-white",
                nameGlow: "0 0 30px rgba(132,204,22,0.8), 0 0 60px rgba(34,197,94,0.4)",
                badgeClass: "bg-lime-500",
                decorEmojis: ["⭐", "🌟", "🎤", "🎵", "🤩"],
                decorCount: 14,
                style: "soft" as const,
            },
        }),
        timerUrgencyClass: "fun-timer-urgent",
    },
    rootClassName: "theme-fun",
};
