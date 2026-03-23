/**
 * cyber テーマ — サイバーパンク / ターミナルハッカー感
 *
 * マトリックス風の文字レイン、グリッチ演出、ネオングローで近未来感を演出。
 * ダーク背景にカタカナ・記号が降り注ぐハッカー画面風の常時エフェクト。
 * 正解時は紙吹雪ではなくグリッチフラッシュ + "ACCESS GRANTED" 風テキスト。
 */

import { createElement } from "react";
import type { AnimationThemeConfig } from "../types.js";
import { MatrixRain } from "../effects/MatrixRain.js";
import { CyberGlitch } from "../effects/CyberGlitch.js";
import { SpotlightEffect } from "../effects/SpotlightEffect.js";

export const cyberTheme: AnimationThemeConfig = {
    name: "cyber",
    colors: {
        bgGradient: "from-gray-950/85 via-slate-900/80 to-indigo-950/85",
        cardBg: "bg-gray-900/70 backdrop-blur-md border border-cyan-500/20",
        cardBorder: "border-cyan-500/40",
        buttonPrimary: "bg-cyan-600 shadow-lg shadow-cyan-500/40",
        buttonPrimaryHover: "hover:bg-cyan-500 hover:shadow-cyan-400/60",
        buttonAccent: "bg-fuchsia-500 shadow-lg shadow-fuchsia-500/40",
        buttonAccentHover: "hover:bg-fuchsia-400 hover:shadow-fuchsia-400/60",
        textPrimary: "text-gray-100",
        textSecondary: "text-cyan-400",
        textAccent: "text-cyan-300",
        explanationBg: "bg-cyan-950/70 backdrop-blur-sm border border-cyan-500/20",
        explanationText: "text-cyan-200",
        highlightGradient: "from-cyan-950/80 to-blue-950/80",
        inputField: "bg-gray-800/80 border-cyan-500/30 text-gray-100 placeholder:text-gray-500",
        inputFocus: "focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30",
        labelText: "text-cyan-300",
        surfaceMuted: "bg-gray-800/50",
        badgeSuccess: "bg-green-900/60 text-green-300",
        badgeError: "bg-red-900/60 text-red-300",
        badgeWarning: "bg-yellow-900/60 text-yellow-300",
        badgeMuted: "bg-gray-800/60 text-gray-500",
        buttonDanger: "border-red-500/50 text-red-400 hover:bg-red-900/30",
        buttonGhost: "border-cyan-500/30 text-cyan-400 hover:bg-cyan-900/20",
        modalBg: "bg-gray-900/90 backdrop-blur-md",
        choiceIndexBadge: "bg-cyan-600",
        participantOnline: "bg-green-400",
        participantOffline: "bg-gray-600",
        statusOk: "text-green-400",
        chipSelected: "bg-cyan-600 text-white",
        chipDefault: "bg-gray-800 text-cyan-400 hover:bg-gray-700",
        spinner: "border-cyan-800 border-t-cyan-400",
        progressIndicator: "bg-cyan-950/70 text-cyan-300",
        linkText: "text-cyan-400",
    },
    variants: {
        questionEntry: {
            initial: { opacity: 0, x: 40, skewX: -5, filter: "brightness(0.5)" },
            animate: {
                opacity: 1,
                x: 0,
                skewX: 0,
                filter: "brightness(1)",
                transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
            },
        },
        questionExit: {
            exit: {
                opacity: 0,
                x: -20,
                skewX: 3,
                transition: { duration: 0.25, ease: "easeIn" },
            },
        },
        choiceEntry: {
            initial: { opacity: 0, x: 50, skewX: -4, filter: "brightness(0.3)" },
            animate: (i: number) => ({
                opacity: 1,
                x: 0,
                skewX: 0,
                filter: "brightness(1)",
                transition: {
                    duration: 0.4,
                    delay: i * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                },
            }),
        },
        correctReveal: {
            initial: { scale: 1, filter: "brightness(1)" },
            animate: {
                scale: [1, 1.12, 1.04],
                filter: ["brightness(1)", "brightness(2)", "brightness(1.2)"],
                transition: { duration: 0.6, ease: "easeOut" },
            },
        },
        wrongReveal: {
            initial: { x: 0, opacity: 1 },
            animate: {
                x: [0, -4, 4, -2, 0],
                opacity: [1, 0.5, 1, 0.5, 0.4],
                transition: { duration: 0.35, ease: "easeOut" },
            },
        },
        scoreUpdate: {
            initial: { scale: 1, filter: "brightness(1)" },
            animate: {
                scale: [1, 1.2, 1],
                filter: ["brightness(1)", "brightness(1.8)", "brightness(1)"],
                transition: { duration: 0.5, ease: "easeOut" },
            },
        },
        phaseTransition: {
            initial: { opacity: 0, x: 40 },
            animate: {
                opacity: 1,
                x: 0,
                transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
            },
            exit: {
                opacity: 0,
                x: -40,
                transition: { duration: 0.25, ease: "easeIn" },
            },
        },
        resultEntry: {
            initial: { opacity: 0, y: 20, filter: "brightness(0.5)" },
            animate: (i: number) => ({
                opacity: 1,
                y: 0,
                filter: "brightness(1)",
                transition: {
                    duration: 0.5,
                    delay: i * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94],
                },
            }),
        },
        participantJoin: {
            initial: { opacity: 0, x: 24, skewX: -2 },
            animate: {
                opacity: 1,
                x: 0,
                skewX: 0,
                transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
            },
        },
    },
    effects: {
        onCorrect: () => createElement(CyberGlitch),
        onInterview: (name: string) => createElement(SpotlightEffect, {
            subjectName: name,
            config: {
                color: "rgba(0, 255, 204, 0.5)",
                glowColor: "rgba(0, 255, 255, 0.2)",
                overlayColor: "rgba(0, 0, 0, 0.75)",
                nameColor: "text-cyan-300",
                nameGlow: "0 0 20px rgba(0,255,204,0.9), 0 0 50px rgba(0,255,255,0.5), 0 0 80px rgba(139,92,246,0.3)",
                badgeClass: "bg-cyan-600",
                decorEmojis: ["⚡", "💎", "🎤", "🔮", "▶", "◆"],
                decorCount: 10,
                style: "hard" as const,
            },
        }),
        timerUrgencyClass: "cyber-timer-urgent",
        ambient: () => createElement(MatrixRain, {
            config: {
                color: "#00ffcc",
                highlightColor: "#ffffff",
                fontSize: 18,
                speed: 0.35,
                opacity: 0.55,
                fadeAlpha: 0.04,
            },
        }),
    },
    rootClassName: "theme-cyber",
};
