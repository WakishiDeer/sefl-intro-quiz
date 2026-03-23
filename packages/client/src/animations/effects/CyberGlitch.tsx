/**
 * CyberGlitch — グリッチ / データ破損風の正解演出エフェクト
 *
 * cyber テーマの正解時に表示するオーバーレイ。
 * ターミナル風のスキャンライン + ランダムな水平グリッチバーが走り、
 * 画面全体がデータ転送成功のような演出になる。
 * 一定時間後に自動で非表示になる。
 */

import { useEffect, useState } from "react";

/** グリッチバー1本分のデータ */
interface GlitchBar {
    id: number;
    /** 画面上端からの位置 (%) */
    top: number;
    /** バーの高さ (px) */
    height: number;
    /** 水平方向のオフセット (px) — 左右にずれてグリッチ感を演出 */
    offsetX: number;
    /** アニメーション遅延 (s) */
    delay: number;
    /** バーの色 */
    color: string;
    /** 幅 (%) */
    width: number;
}

const GLITCH_COUNT = 12;
const DURATION_MS = 1500;

const GLITCH_COLORS = [
    "rgba(0, 255, 255, 0.6)",
    "rgba(0, 255, 255, 0.3)",
    "rgba(255, 0, 128, 0.4)",
    "rgba(139, 92, 246, 0.35)",
    "rgba(0, 255, 128, 0.3)",
];

/** "ACCESS GRANTED" 風のテキスト群 */
const CYBER_TEXTS = [
    "CORRECT ///",
    ">> ACCESS GRANTED",
    "STATUS: OK",
    "[SUCCESS]",
    "DATA VERIFIED ✓",
    "0x00FF00",
];

export function CyberGlitch() {
    const [visible, setVisible] = useState(true);
    const [glitchBars] = useState<GlitchBar[]>(() =>
        Array.from({ length: GLITCH_COUNT }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            height: 1 + Math.random() * 4,
            offsetX: (Math.random() - 0.5) * 30,
            delay: Math.random() * 0.3,
            color: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)]!,
            width: 20 + Math.random() * 80,
        })),
    );
    const [cyberText] = useState(
        () => CYBER_TEXTS[Math.floor(Math.random() * CYBER_TEXTS.length)]!,
    );

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            {/* 全画面フラッシュ */}
            <div className="animate-cyber-flash absolute inset-0 bg-cyan-400/10" />

            {/* グリッチバー（水平ノイズライン） */}
            {glitchBars.map((bar) => (
                <div
                    key={bar.id}
                    className="animate-cyber-glitch-bar absolute"
                    style={{
                        top: `${bar.top}%`,
                        left: `${50 - bar.width / 2 + bar.offsetX}%`,
                        width: `${bar.width}%`,
                        height: `${bar.height}px`,
                        backgroundColor: bar.color,
                        animationDelay: `${bar.delay}s`,
                        boxShadow: `0 0 8px ${bar.color}`,
                    }}
                />
            ))}

            {/* "ACCESS GRANTED" 風テキスト */}
            <div className="animate-cyber-text absolute inset-0 flex items-center justify-center">
                <span
                    className="font-mono text-2xl font-bold tracking-widest text-cyan-400 md:text-4xl"
                    style={{
                        textShadow: "0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)",
                    }}
                >
                    {cyberText}
                </span>
            </div>

            {/* スキャンライン走査 */}
            <div className="animate-cyber-scanline absolute left-0 h-0.5 w-full bg-linear-to-r from-transparent via-cyan-400/60 to-transparent" />
        </div>
    );
}
