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

export const cyberTheme: AnimationThemeConfig = {
    name: "cyber",
    colors: {
        bgGradient: "from-gray-950 via-slate-900 to-indigo-950",
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
        timerUrgencyClass: "cyber-timer-urgent",
        ambient: () => createElement(MatrixRain, {
            config: {
                color: "#00ffcc",
                highlightColor: "#ffffff",
                fontSize: 14,
                speed: 0.6,
                opacity: 0.35,
                fadeAlpha: 0.06,
            },
        }),
    },
    rootClassName: "theme-cyber",
};
