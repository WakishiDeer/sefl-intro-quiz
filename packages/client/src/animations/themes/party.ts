/**
 * party テーマ — パーティー / ワイワイモード
 *
 * 大きな bounce、confetti burst、wobble で盛り上がる演出。
 * 常時カラフルなドットが浮遊する。正解時は canvas-confetti で紙吹雪。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { ConfettiEffect } from "../effects/ConfettiEffect.js";
import { AmbientParticles } from "../effects/AmbientParticles.js";

export const partyTheme: AnimationThemeConfig = {
    name: "party",
    colors: {
        bgGradient: "from-fuchsia-200 via-pink-100 to-violet-200",
        cardBg: "bg-white/80 backdrop-blur-sm",
        cardBorder: "border-fuchsia-300",
        buttonPrimary: "bg-fuchsia-600 shadow-lg shadow-fuchsia-400/50",
        buttonPrimaryHover: "hover:bg-fuchsia-700 hover:shadow-fuchsia-500/60",
        buttonAccent: "bg-pink-500 shadow-lg shadow-pink-400/50",
        buttonAccentHover: "hover:bg-pink-600",
        textPrimary: "text-gray-900",
        textSecondary: "text-fuchsia-600",
        textAccent: "text-fuchsia-700",
        explanationBg: "bg-fuchsia-100/80 backdrop-blur-sm",
        explanationText: "text-fuchsia-900",
        highlightGradient: "from-fuchsia-100 to-pink-100",
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
        onCorrect: () => createElement(ConfettiEffect),
        ambient: () => createElement(AmbientParticles, {
            config: {
                colors: ["#f472b6", "#a78bfa", "#60a5fa", "#34d399", "#fbbf24", "#fb923c", "#f43f5e"],
                count: 35,
                minSize: 3,
                maxSize: 7,
                speed: 0.5,
                shape: "circle" as const,
                twinkle: true,
                direction: "float" as const,
                opacity: 0.5,
            },
        }),
        timerUrgencyClass: "party-timer-urgent",
    },
    rootClassName: "theme-party",
};
