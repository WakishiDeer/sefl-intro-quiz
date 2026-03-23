/**
 * sakura テーマ — 桜 / 春の雰囲気
 *
 * 花びらが舞い上がるような柔らかい動き。
 * 常時桜の花びらが画面を舞い落ちる。正解時に花びら散る演出。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { Petals } from "../effects/Petals.js";
import { SakuraAmbient } from "../effects/SakuraAmbient.js";
import { SpotlightEffect } from "../effects/SpotlightEffect.js";

export const sakuraTheme: AnimationThemeConfig = {
    name: "sakura",
    colors: {
        bgGradient: "from-pink-200/70 via-rose-100/60 to-fuchsia-200/70",
        cardBg: "bg-white/80 backdrop-blur-sm",
        cardBorder: "border-pink-300",
        buttonPrimary: "bg-pink-500 shadow-lg shadow-pink-400/50",
        buttonPrimaryHover: "hover:bg-pink-600 hover:shadow-pink-500/60",
        buttonAccent: "bg-rose-500 shadow-lg shadow-rose-400/50",
        buttonAccentHover: "hover:bg-rose-600",
        textPrimary: "text-rose-950",
        textSecondary: "text-pink-600",
        textAccent: "text-pink-700",
        explanationBg: "bg-pink-100/80 backdrop-blur-sm",
        explanationText: "text-pink-900",
        highlightGradient: "from-pink-100 to-rose-100",
        inputField: "bg-white/80 border-pink-300 text-rose-950 placeholder:text-pink-300",
        inputFocus: "focus:border-pink-500 focus:ring-1 focus:ring-pink-200",
        labelText: "text-pink-800",
        surfaceMuted: "bg-pink-50/60",
        badgeSuccess: "bg-green-100 text-green-700",
        badgeError: "bg-red-100 text-red-700",
        badgeWarning: "bg-yellow-100 text-yellow-700",
        badgeMuted: "bg-gray-100 text-gray-400",
        buttonDanger: "border-red-300 text-red-600 hover:bg-red-50",
        buttonGhost: "border-pink-300 text-pink-600 hover:bg-pink-50",
        modalBg: "bg-white/90 backdrop-blur-sm",
        choiceIndexBadge: "bg-pink-500",
        participantOnline: "bg-green-400",
        participantOffline: "bg-gray-400",
        statusOk: "text-green-500",
        chipSelected: "bg-pink-500 text-white",
        chipDefault: "bg-pink-50 text-pink-700 hover:bg-pink-100",
        spinner: "border-pink-200 border-t-pink-600",
        progressIndicator: "bg-pink-50 text-pink-700",
        linkText: "text-pink-600",
    },
    variants: {
        questionEntry: {
            initial: { opacity: 0, y: 30, rotate: -3, scale: 0.95 },
            animate: {
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                transition: { duration: 0.7, ease: [0.37, 0, 0.63, 1] },
            },
        },
        questionExit: {
            exit: {
                opacity: 0,
                y: -15,
                rotate: 1,
                transition: { duration: 0.35, ease: [0.37, 0, 0.63, 1] },
            },
        },
        choiceEntry: {
            initial: { opacity: 0, y: 24, rotate: -2, scale: 0.9 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                transition: {
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.37, 0, 0.63, 1],
                },
            }),
        },
        correctReveal: {
            initial: { scale: 1, rotate: 0 },
            animate: {
                scale: [1, 1.12, 1],
                rotate: [0, 2, -1, 0.5, 0],
                transition: { duration: 0.6, ease: [0.37, 0, 0.63, 1] },
            },
        },
        wrongReveal: {
            initial: { x: 0, opacity: 1 },
            animate: {
                x: [0, -3, 3, -2, 0],
                opacity: [1, 0.8, 0.8, 0.6, 0.5],
                transition: { duration: 0.4, ease: [0.37, 0, 0.63, 1] },
            },
        },
        scoreUpdate: {
            initial: { scale: 1, y: 0 },
            animate: {
                scale: [1, 1.15, 0.97, 1],
                y: [0, -6, 2, 0],
                transition: { duration: 0.5, ease: [0.37, 0, 0.63, 1] },
            },
        },
        phaseTransition: {
            initial: { opacity: 0, y: 12 },
            animate: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: [0.37, 0, 0.63, 1] },
            },
            exit: {
                opacity: 0,
                y: -12,
                transition: { duration: 0.3, ease: [0.37, 0, 0.63, 1] },
            },
        },
        resultEntry: {
            initial: { opacity: 0, y: 40, rotate: -3, scale: 0.9 },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                rotate: 0,
                scale: 1,
                transition: {
                    duration: 0.7,
                    delay: i * 0.15,
                    ease: [0.37, 0, 0.63, 1],
                },
            }),
        },
        participantJoin: {
            initial: { opacity: 0, y: 12, rotate: -1 },
            animate: {
                opacity: 1,
                y: 0,
                rotate: 0,
                transition: { duration: 0.4, ease: [0.37, 0, 0.63, 1] },
            },
        },
    },
    effects: {
        onCorrect: () => createElement(Petals),
        ambient: () => createElement(SakuraAmbient),
        onInterview: (name: string) => createElement(SpotlightEffect, {
            subjectName: name,
            config: {
                color: "rgba(219, 39, 119, 0.4)",
                glowColor: "rgba(244, 114, 182, 0.2)",
                overlayColor: "rgba(30, 10, 20, 0.6)",
                nameColor: "text-white",
                nameGlow: "0 0 25px rgba(244,114,182,0.8), 0 0 50px rgba(219,39,119,0.4)",
                badgeClass: "bg-pink-400",
                decorEmojis: ["🌸", "🎤", "💮", "🩷", "✿"],
                decorCount: 15,
                style: "soft" as const,
            },
        }),
        timerUrgencyClass: "sakura-timer-urgent",
    },
    rootClassName: "theme-sakura",
};
