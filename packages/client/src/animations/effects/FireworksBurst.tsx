/**
 * FireworksBurst — 花火バーストエフェクト
 *
 * party テーマの正解演出。画面の複数箇所で花火が時間差で打ち上がり、
 * スパークが軌跡を残しながら重力で広がってフェードアウトする。
 * 中央に祝福テキストがポップアップして消える。
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** 花火カラーパレット — 各花火は 1 パレットからランダムに選ばれる */
const FIREWORK_PALETTES = [
    ["#FFD700", "#FFA500", "#FFEC8B"], // Gold
    ["#A855F7", "#9333EA", "#C084FC"], // Purple
    ["#06B6D4", "#22D3EE", "#67E8F9"], // Cyan
    ["#F43F5E", "#FB7185", "#FDA4AF"], // Rose
    ["#10B981", "#34D399", "#6EE7B7"], // Emerald
];

/** 祝福テキスト */
const CELEBRATION_TEXTS = [
    "PARTY!!",
    "GREAT!",
    "NICE!",
    "AWESOME!",
    "PERFECT!",
    "YEAH!!",
];

const DURATION_MS = 2800;
const BURST_COUNT = 5;
const TRAIL_LENGTH = 6;

interface Spark {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    alpha: number;
    size: number;
    /** 軌跡ポイント（最新 TRAIL_LENGTH 個を保持） */
    trail: Array<{ x: number; y: number }>;
}

interface Burst {
    sparks: Spark[];
    /** この花火が開始するフレーム番号 */
    startFrame: number;
    /** フラッシュ中心 */
    cx: number;
    cy: number;
}

export function FireworksBurst() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(true);
    const [celebText] = useState(
        () => CELEBRATION_TEXTS[Math.floor(Math.random() * CELEBRATION_TEXTS.length)]!,
    );

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!visible) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const startTime = performance.now();

        /* ── 花火の打ち上げスケジュール ── */
        const launchDelays = [0, 250, 500, 800, 1200];
        const bursts: Burst[] = launchDelays.slice(0, BURST_COUNT).map((delay) => {
            const cx = canvas.width * (0.15 + Math.random() * 0.7);
            const cy = canvas.height * (0.15 + Math.random() * 0.4);
            const palette = FIREWORK_PALETTES[Math.floor(Math.random() * FIREWORK_PALETTES.length)]!;
            const sparkCount = 45 + Math.floor(Math.random() * 20);

            const sparks: Spark[] = Array.from({ length: sparkCount }, () => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 4;
                return {
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    color: palette[Math.floor(Math.random() * palette.length)]!,
                    alpha: 1,
                    size: 1.5 + Math.random() * 2,
                    trail: [],
                };
            });

            return { sparks, startFrame: Math.round(delay / 16.67), cx, cy };
        });

        let frameCount = 0;
        let animId: number;

        function animate(now: number) {
            if (!ctx || !canvas) return;
            const elapsed = now - startTime;

            if (elapsed > DURATION_MS) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frameCount++;

            /* ── フェードアウト係数（最後 600ms） ── */
            const fadeStart = DURATION_MS - 600;
            const globalFade = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 600 : 1;

            /* ── 各花火の描画 ── */
            for (const burst of bursts) {
                if (frameCount < burst.startFrame) continue;
                const age = frameCount - burst.startFrame;

                /* 花火の発射フラッシュ */
                if (age < 12) {
                    const flashAlpha = Math.max(0, 0.15 * (1 - age / 12)) * globalFade;
                    const flashGrad = ctx.createRadialGradient(
                        burst.cx, burst.cy, 0, burst.cx, burst.cy, 120,
                    );
                    flashGrad.addColorStop(0, `rgba(255, 215, 0, ${flashAlpha})`);
                    flashGrad.addColorStop(1, "transparent");
                    ctx.fillStyle = flashGrad;
                    ctx.fillRect(burst.cx - 120, burst.cy - 120, 240, 240);
                }

                /* スパーク描画 */
                for (const s of burst.sparks) {
                    /* 軌跡を記録 */
                    s.trail.push({ x: s.x, y: s.y });
                    if (s.trail.length > TRAIL_LENGTH) s.trail.shift();

                    /* 物理更新 */
                    s.x += s.vx;
                    s.y += s.vy;
                    s.vy += 0.04;
                    s.vx *= 0.985;
                    s.vy *= 0.985;
                    s.alpha = Math.max(0, 1 - age / 90);

                    if (s.alpha <= 0) continue;

                    /* 軌跡ラインを描画 */
                    if (s.trail.length > 1) {
                        ctx.strokeStyle = s.color;
                        ctx.lineWidth = s.size * 0.5;
                        for (let t = 1; t < s.trail.length; t++) {
                            const trailAlpha = (t / s.trail.length) * s.alpha * 0.35 * globalFade;
                            ctx.globalAlpha = trailAlpha;
                            ctx.beginPath();
                            ctx.moveTo(s.trail[t - 1]!.x, s.trail[t - 1]!.y);
                            ctx.lineTo(s.trail[t]!.x, s.trail[t]!.y);
                            ctx.stroke();
                        }
                    }

                    /* スパーク本体 */
                    ctx.globalAlpha = s.alpha * globalFade;
                    ctx.fillStyle = s.color;
                    ctx.shadowBlur = 6;
                    ctx.shadowColor = s.color;
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }

            /* ── 祝福テキスト (中央) ── */
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const textPhase = Math.min(1, elapsed / 300);
            const textFade = elapsed > 1800 ? Math.max(0, 1 - (elapsed - 1800) / 600) : 1;
            const textScale = 0.5 + textPhase * 0.5 + Math.sin(elapsed * 0.008) * 0.03;

            if (textFade > 0 && globalFade > 0) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(textScale, textScale);
                ctx.globalAlpha = textFade * globalFade * 0.9;
                ctx.font = "bold 64px system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.shadowColor = "#FFD700";
                ctx.shadowBlur = 30;
                ctx.fillStyle = "#A855F7";
                ctx.fillText(celebText, 0, 0);

                ctx.shadowBlur = 0;
                ctx.strokeStyle = "rgba(255, 215, 0, 0.7)";
                ctx.lineWidth = 2;
                ctx.strokeText(celebText, 0, 0);
                ctx.restore();
            }

            ctx.globalAlpha = 1;
            animId = requestAnimationFrame(animate);
        }

        animId = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animId);
    }, [visible, celebText]);

    if (!visible) return null;

    return createPortal(
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-[9999]"
            aria-hidden="true"
        />,
        document.body,
    );
}
