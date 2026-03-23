/**
 * fun テーマ — 程よく楽しい
 *
 * bounce や sparkle でクイズ番組っぽいワクワク感。
 * 正解時にキラキラエフェクト、常時小さな星が浮遊。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { Sparkles } from "../effects/Sparkles.js";
import { AmbientParticles } from "../effects/AmbientParticles.js";

export const funTheme: AnimationThemeConfig = {
    name: "fun",
    colors: {
        bgGradient: "from-amber-200 via-orange-100 to-yellow-200",
        cardBg: "bg-white/80 backdrop-blur-sm",
        cardBorder: "border-amber-300",
        buttonPrimary: "bg-amber-500 shadow-lg shadow-amber-300/50",
        buttonPrimaryHover: "hover:bg-amber-600 hover:shadow-amber-400/60",
        buttonAccent: "bg-orange-500 shadow-lg shadow-orange-300/50",
        buttonAccentHover: "hover:bg-orange-600",
        textPrimary: "text-gray-900",
        textSecondary: "text-amber-700",
        textAccent: "text-amber-600",
        explanationBg: "bg-amber-100/80 backdrop-blur-sm",
        explanationText: "text-amber-900",
        highlightGradient: "from-amber-100 to-yellow-100",
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
        onCorrect: () => createElement(Sparkles),
        ambient: () => createElement(AmbientParticles, {
            config: {
                colors: ["#fbbf24", "#f59e0b", "#fcd34d", "#fb923c", "#f97316"],
                count: 30,
                minSize: 3,
                maxSize: 7,
                speed: 0.6,
                shape: "star" as const,
                twinkle: true,
                direction: "float" as const,
                opacity: 0.65,
            },
        }),
        timerUrgencyClass: "fun-timer-urgent",
    },
    rootClassName: "theme-fun",
};
