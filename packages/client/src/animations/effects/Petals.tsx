/**
 * Petals — 桜テーマの正解演出エフェクト（全画面桜吹雪バースト）
 *
 * Canvas ベースの全画面エフェクト。正解時に春風が吹き抜けるような
 * 花びら吹雪を演出する。リアルな桜花びら形状（先端の切れ込み）、
 * 螺旋軌道、緩急のある動きで圧倒的な春感を表現。
 */

import { useEffect, useRef, useState } from "react";

/** 花びらの色バリエーション */
const BURST_COLORS = [
    { fill: "#fbb6ce", accent: "#f9a8d4" },
    { fill: "#fbcfe8", accent: "#f9a8d4" },
    { fill: "#fce7f3", accent: "#fbcfe8" },
    { fill: "#f9a8d4", accent: "#f472b6" },
    { fill: "#fda4af", accent: "#fb7185" },
    { fill: "#fff1f2", accent: "#fecdd3" },
];

const BURST_PETAL_COUNT = 50;
const DURATION_MS = 3000;

interface BurstPetal {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
    tumble: number;
    tumbleSpeed: number;
    colorIndex: number;
    opacity: number;
    /** 風の影響でカーブさせる力 */
    curvature: number;
    gravity: number;
    drag: number;
    /** 出現遅延 (ms) */
    delay: number;
    spawned: boolean;
}

/** 切れ込み付きの桜花びらを描画する */
function drawBurstPetal(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, size: number,
    rotation: number, tumble: number,
    fillColor: string, accentColor: string,
) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    const tumbleFactor = 0.25 + 0.75 * Math.abs(Math.cos(tumble));
    ctx.scale(tumbleFactor, 1);

    const s = size;
    ctx.beginPath();
    ctx.moveTo(0, s * 0.55);
    ctx.bezierCurveTo(s * 0.35, s * 0.35, s * 0.55, 0, s * 0.4, -s * 0.3);
    ctx.quadraticCurveTo(s * 0.3, -s * 0.45, s * 0.15, -s * 0.5);
    ctx.quadraticCurveTo(s * 0.05, -s * 0.38, 0, -s * 0.4);
    ctx.quadraticCurveTo(-s * 0.05, -s * 0.38, -s * 0.15, -s * 0.5);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.45, -s * 0.4, -s * 0.3);
    ctx.bezierCurveTo(-s * 0.55, 0, -s * 0.35, s * 0.35, 0, s * 0.55);
    ctx.closePath();

    const grad = ctx.createRadialGradient(0, s * 0.1, 0, 0, 0, s * 0.55);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(0.35, fillColor);
    grad.addColorStop(1, fillColor);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
}

export function Petals() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(true);

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

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // バースト: 画面中央から放射状 + 右方向への春風バイアス
        const petals: BurstPetal[] = Array.from({ length: BURST_PETAL_COUNT }, (_, i) => {
            const angle = (Math.PI * 2 * i) / BURST_PETAL_COUNT + (Math.random() - 0.5) * 0.8;
            const speed = 2 + Math.random() * 5;
            return {
                x: centerX + (Math.random() - 0.5) * 100,
                y: centerY + (Math.random() - 0.5) * 100,
                vx: Math.cos(angle) * speed + 1.5,
                vy: Math.sin(angle) * speed - 1,
                size: 10 + Math.random() * 16,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                tumble: Math.random() * Math.PI * 2,
                tumbleSpeed: 0.03 + Math.random() * 0.06,
                colorIndex: Math.floor(Math.random() * BURST_COLORS.length),
                opacity: 0.7 + Math.random() * 0.3,
                curvature: (Math.random() - 0.5) * 0.1,
                gravity: 0.02 + Math.random() * 0.03,
                drag: 0.985 + Math.random() * 0.01,
                delay: Math.random() * 300,
                spawned: false,
            };
        });

        const startTime = performance.now();
        let animId: number;

        function animate(now: number) {
            if (!ctx || !canvas) return;
            const elapsed = now - startTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // ピンクのフラッシュ（最初の 0.5 秒）
            if (elapsed < 500) {
                const flashAlpha = Math.max(0, 0.15 * (1 - elapsed / 500));
                ctx.fillStyle = `rgba(251, 182, 206, ${flashAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // フェードアウト（最後の 0.8 秒）
            const fadeStart = DURATION_MS - 800;
            const globalFade = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 800 : 1;

            for (const p of petals) {
                if (!p.spawned) {
                    if (elapsed >= p.delay) p.spawned = true;
                    else continue;
                }

                // 物理更新
                p.vy += p.gravity;
                p.vx += p.curvature;
                p.vx *= p.drag;
                p.vy *= p.drag;

                // 風による揺らぎ
                p.vx += Math.sin(elapsed * 0.002 + p.tumble) * 0.05;

                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.tumble += p.tumbleSpeed;

                // tumble 速度を動的に変化（緩急）
                p.tumbleSpeed += (Math.random() - 0.5) * 0.002;
                p.tumbleSpeed = Math.max(0.01, Math.min(0.08, p.tumbleSpeed));

                const color = BURST_COLORS[p.colorIndex]!;
                ctx.globalAlpha = p.opacity * Math.max(0, globalFade);

                drawBurstPetal(
                    ctx, p.x, p.y, p.size,
                    p.rotation, p.tumble,
                    color.fill, color.accent,
                );
            }

            if (elapsed < DURATION_MS) {
                animId = requestAnimationFrame(animate);
            }
        }

        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [visible]);

    if (!visible) return null;

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-10"
            aria-hidden="true"
        />
    );
}
