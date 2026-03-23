/**
 * PopCelebration — fun テーマの正解演出エフェクト（全画面カラフルバースト）
 *
 * Canvas ベースの全画面エフェクト。正解時にカラフルな星・丸が画面中央から
 * 放射状に飛び散り、「GREAT!」「NICE!」等のポップなテキストが表示される。
 * CyberGlitch の「ACCESS GRANTED」や Petals の桜吹雪に相当する、
 * fun テーマならではの賑やかな祝福演出。
 */

import { useEffect, useRef, useState } from "react";

/** バーストパーティクルの色（ライム・スカイ・エメラルド・バイオレット・ローズ・イエロー） */
const BURST_COLORS = [
    "#84cc16", // lime
    "#38bdf8", // sky
    "#22c55e", // green
    "#a78bfa", // violet
    "#fb7185", // rose
    "#facc15", // yellow
    "#34d399", // emerald
    "#60a5fa", // blue
];

/** 祝福テキスト */
const CELEBRATION_TEXTS = [
    "GREAT!",
    "NICE!",
    "AWESOME!",
    "PERFECT!",
    "AMAZING!",
    "CORRECT!!",
];

const PARTICLE_COUNT = 55;
const DURATION_MS = 2200;

interface BurstParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
    /** "star" | "circle" | "ring" */
    shape: "star" | "circle" | "ring";
    gravity: number;
    drag: number;
    delay: number;
    spawned: boolean;
}

/** 星形を描画する（4点スター） */
function drawStar(ctx: CanvasRenderingContext2D, size: number) {
    const spikes = 4;
    const outerR = size;
    const innerR = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

export function PopCelebration() {
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

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // パーティクルを放射状に生成
        const particles: BurstParticle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
            const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.6;
            const speed = 3 + Math.random() * 7;
            const shapes: Array<"star" | "circle" | "ring"> = ["star", "circle", "ring"];
            return {
                x: centerX + (Math.random() - 0.5) * 60,
                y: centerY + (Math.random() - 0.5) * 60,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2,
                size: 5 + Math.random() * 10,
                color: BURST_COLORS[Math.floor(Math.random() * BURST_COLORS.length)]!,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.15,
                opacity: 0.8 + Math.random() * 0.2,
                shape: shapes[Math.floor(Math.random() * shapes.length)]!,
                gravity: 0.04 + Math.random() * 0.04,
                drag: 0.985 + Math.random() * 0.01,
                delay: Math.random() * 200,
                spawned: false,
            };
        });

        const startTime = performance.now();
        let animId: number;

        function animate(now: number) {
            if (!ctx || !canvas) return;
            const elapsed = now - startTime;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 初回フラッシュ（ライム→白→透明）
            if (elapsed < 400) {
                const flashAlpha = Math.max(0, 0.2 * (1 - elapsed / 400));
                ctx.fillStyle = `rgba(132, 204, 22, ${flashAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // テキスト描画（中央にポップアップ → フェードアウト）
            const textPhase = Math.min(1, elapsed / 300);
            const textFade = elapsed > 1400 ? Math.max(0, 1 - (elapsed - 1400) / 600) : 1;
            const textScale = 0.5 + textPhase * 0.5 + Math.sin(elapsed * 0.008) * 0.03;

            if (textFade > 0) {
                ctx.save();
                ctx.translate(centerX, centerY);
                ctx.scale(textScale, textScale);
                ctx.globalAlpha = textFade * 0.9;
                ctx.font = "bold 64px system-ui, sans-serif";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // テキストのグロー
                ctx.shadowColor = "#84cc16";
                ctx.shadowBlur = 30;
                ctx.fillStyle = "#22c55e";
                ctx.fillText(celebText, 0, 0);

                // 白い縁取り
                ctx.shadowBlur = 0;
                ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
                ctx.lineWidth = 2;
                ctx.strokeText(celebText, 0, 0);
                ctx.restore();
            }

            // フェードアウト（最後の 0.6 秒）
            const fadeStart = DURATION_MS - 600;
            const globalFade = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / 600 : 1;

            // パーティクル描画
            for (const p of particles) {
                if (!p.spawned) {
                    if (elapsed >= p.delay) p.spawned = true;
                    else continue;
                }

                // 物理更新
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.opacity * Math.max(0, globalFade);
                ctx.fillStyle = p.color;

                switch (p.shape) {
                    case "star":
                        drawStar(ctx, p.size);
                        break;
                    case "circle":
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case "ring":
                        ctx.beginPath();
                        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        break;
                }

                ctx.restore();
            }

            if (elapsed < DURATION_MS) {
                animId = requestAnimationFrame(animate);
            }
        }

        animId = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animId);
    }, [visible, celebText]);

    if (!visible) return null;

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-10"
            aria-hidden="true"
        />
    );
}
