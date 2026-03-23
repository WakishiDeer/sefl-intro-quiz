/**
 * PopBubbles — fun テーマ専用の常時背景エフェクト
 *
 * カラフルな半透明バブル（泡）がゆっくり上昇しながらふわふわ揺れる。
 * ポップで楽しいクイズ番組のセット風の雰囲気を演出する。
 * Canvas ベースで requestAnimationFrame によりパフォーマンス最適化済み。
 */

import { useEffect, useRef } from "react";

/** バブルの色バリエーション（ライム・スカイ・エメラルド・バイオレット・ローズ） */
const BUBBLE_COLORS = [
    { fill: "rgba(132, 204, 22, 0.25)", stroke: "rgba(132, 204, 22, 0.5)" },   // lime
    { fill: "rgba(56, 189, 248, 0.25)", stroke: "rgba(56, 189, 248, 0.5)" },    // sky
    { fill: "rgba(16, 185, 129, 0.25)", stroke: "rgba(16, 185, 129, 0.5)" },    // emerald
    { fill: "rgba(167, 139, 250, 0.20)", stroke: "rgba(167, 139, 250, 0.45)" }, // violet
    { fill: "rgba(251, 113, 133, 0.20)", stroke: "rgba(251, 113, 133, 0.45)" }, // rose
    { fill: "rgba(250, 204, 21, 0.20)", stroke: "rgba(250, 204, 21, 0.45)" },   // yellow
];

const BUBBLE_COUNT = 22;

interface Bubble {
    x: number;
    y: number;
    radius: number;
    /** 上昇速度 */
    speed: number;
    /** 横揺れの位相 */
    swayPhase: number;
    /** 横揺れの振幅 */
    swayAmplitude: number;
    /** サイズの拍動位相 */
    pulsePhase: number;
    /** 拍動速度 */
    pulseSpeed: number;
    colorIndex: number;
    opacity: number;
    /** ハイライト（光沢）の角度 */
    highlightAngle: number;
}

/**
 * バブルを描画する（光沢のある半透明な泡）
 */
function drawBubble(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    strokeColor: string,
    highlightAngle: number,
) {
    // 本体の円
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 光沢ハイライト（楕円の白い反射）
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(highlightAngle);
    ctx.beginPath();
    ctx.ellipse(
        -radius * 0.25, -radius * 0.25,
        radius * 0.35, radius * 0.15,
        -0.5, 0, Math.PI * 2,
    );
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.fill();
    ctx.restore();
}

export function PopBubbles() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // バブルの初期化
        const bubbles: Bubble[] = Array.from({ length: BUBBLE_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: canvas.height + Math.random() * canvas.height,
            radius: 12 + Math.random() * 28,
            speed: 0.3 + Math.random() * 0.6,
            swayPhase: Math.random() * Math.PI * 2,
            swayAmplitude: 0.8 + Math.random() * 1.5,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.01 + Math.random() * 0.02,
            colorIndex: Math.floor(Math.random() * BUBBLE_COLORS.length),
            opacity: 0.5 + Math.random() * 0.4,
            highlightAngle: Math.random() * Math.PI * 2,
        }));

        let animId: number;

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const b of bubbles) {
                // 上昇
                b.y -= b.speed;

                // 横揺れ
                b.x += Math.sin(b.swayPhase) * b.swayAmplitude;
                b.swayPhase += 0.008 + b.speed * 0.003;

                // サイズの拍動（ぷくぷく感）
                b.pulsePhase += b.pulseSpeed;
                const pulseFactor = 1 + 0.08 * Math.sin(b.pulsePhase);
                const currentRadius = b.radius * pulseFactor;

                // 画面外（上端）→ リセット（下から再登場）
                if (b.y < -currentRadius * 2) {
                    b.y = canvas.height + currentRadius * 2;
                    b.x = Math.random() * canvas.width;
                    b.colorIndex = Math.floor(Math.random() * BUBBLE_COLORS.length);
                }
                // 左右の巻き戻し
                if (b.x < -currentRadius * 2) b.x = canvas.width + currentRadius;
                if (b.x > canvas.width + currentRadius * 2) b.x = -currentRadius;

                const color = BUBBLE_COLORS[b.colorIndex]!;
                ctx.globalAlpha = b.opacity;

                drawBubble(
                    ctx, b.x, b.y, currentRadius,
                    color.fill, color.stroke, b.highlightAngle,
                );
            }

            animId = requestAnimationFrame(animate);
        }

        animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0"
            aria-hidden="true"
        />
    );
}
