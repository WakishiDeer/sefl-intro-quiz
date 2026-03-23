/**
 * SakuraAmbient — 桜テーマ専用の常時背景花びらエフェクト
 *
 * リアルな桜の花びら形状（先端に切れ込み）を Canvas で描画。
 * 風による揺らぎ、3D 回転によるひらひら感、緩急のある落下速度で
 * 本物の桜吹雪を再現する。AmbientParticles の汎用楕円とは異なり、
 * 桜花びら特有のベジェ曲線シルエットを使用。
 */

import { useEffect, useRef } from "react";

/** 桜花びらの色バリエーション（fill + 中心脈のアクセント色） */
const PETAL_COLORS = [
    { fill: "#fbb6ce", accent: "#f9a8d4" },
    { fill: "#fbcfe8", accent: "#f9a8d4" },
    { fill: "#fce7f3", accent: "#fbcfe8" },
    { fill: "#f9a8d4", accent: "#f472b6" },
    { fill: "#fda4af", accent: "#fb7185" },
];

/** 画面に表示する花びらの数 */
const PETAL_COUNT = 28;

interface SakuraPetal {
    x: number;
    y: number;
    size: number;
    rotation: number;
    rotationSpeed: number;
    /** 3D 回転角（ひらひら向き変化用） */
    tumble: number;
    tumbleSpeed: number;
    /** 基本落下速度 */
    baseSpeed: number;
    /** 緩急の位相 */
    speedPhase: number;
    /** 横揺れの位相 */
    swayPhase: number;
    /** 横揺れの振幅 */
    swayAmplitude: number;
    colorIndex: number;
    opacity: number;
    /** 風への感度（前景の大きな花びらほど風の影響を受けやすい） */
    windSensitivity: number;
    /** 奥行き (0=遠景, 1=近景) */
    depth: number;
}

/**
 * 桜の花びらを描画する（先端の切れ込み付き）。
 * ベジェ曲線で有機的な輪郭を描き、tumble で 3D 回転のひらひら感を表現。
 */
function drawSakuraPetal(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    rotation: number,
    tumble: number,
    fillColor: string,
    accentColor: string,
) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    // 3D tumble: scaleX を変化させてひらひら感を演出
    const tumbleFactor = 0.3 + 0.7 * Math.abs(Math.cos(tumble));
    ctx.scale(tumbleFactor, 1);

    const s = size;
    ctx.beginPath();
    // 下端（茎の付け根・細い方）
    ctx.moveTo(0, s * 0.55);
    // 右側の膨らみ
    ctx.bezierCurveTo(s * 0.35, s * 0.35, s * 0.55, 0, s * 0.4, -s * 0.3);
    // 右上 → 切れ込みの右端
    ctx.quadraticCurveTo(s * 0.3, -s * 0.45, s * 0.15, -s * 0.5);
    // 切れ込み（V 字の底）
    ctx.quadraticCurveTo(s * 0.05, -s * 0.38, 0, -s * 0.4);
    // 切れ込みから左上へ
    ctx.quadraticCurveTo(-s * 0.05, -s * 0.38, -s * 0.15, -s * 0.5);
    // 左上 → 左側の膨らみ
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.45, -s * 0.4, -s * 0.3);
    // 左側のカーブ → 下端に戻る
    ctx.bezierCurveTo(-s * 0.55, 0, -s * 0.35, s * 0.35, 0, s * 0.55);
    ctx.closePath();

    // 中心から外へのグラデーション（花びらの脈を暗示）
    const grad = ctx.createRadialGradient(0, s * 0.1, 0, 0, 0, s * 0.55);
    grad.addColorStop(0, accentColor);
    grad.addColorStop(0.35, fillColor);
    grad.addColorStop(1, fillColor);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
}

export function SakuraAmbient() {
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

        // 花びらの初期化
        const petals: SakuraPetal[] = Array.from({ length: PETAL_COUNT }, () => {
            const depth = Math.random();
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: 8 + depth * 12,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
                tumble: Math.random() * Math.PI * 2,
                tumbleSpeed: 0.015 + Math.random() * 0.025,
                baseSpeed: 0.3 + depth * 0.5,
                speedPhase: Math.random() * Math.PI * 2,
                swayPhase: Math.random() * Math.PI * 2,
                swayAmplitude: 0.5 + Math.random() * 1.5,
                colorIndex: Math.floor(Math.random() * PETAL_COLORS.length),
                opacity: 0.3 + depth * 0.4,
                windSensitivity: 0.5 + depth * 0.5,
                depth,
            };
        });

        // 風の状態
        let windForce = 0;
        let windTarget = 0;
        let windChangeTimer = 3000;

        let animId: number;

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 風の更新（3〜8 秒ごとに方向転換、ゆっくり追従）
            windChangeTimer -= 16;
            if (windChangeTimer <= 0) {
                windTarget = (Math.random() - 0.3) * 1.5;
                windChangeTimer = 3000 + Math.random() * 5000;
            }
            windForce += (windTarget - windForce) * 0.008;

            for (const p of petals) {
                // 緩急のある落下速度（正弦波で周期的に加減速）
                const speedMod = 0.6 + 0.4 * Math.sin(p.speedPhase);
                p.speedPhase += 0.003 + p.depth * 0.004;

                // 横揺れ（サイン波によるふわふわ挙動）
                p.x += Math.sin(p.swayPhase) * p.swayAmplitude;
                p.swayPhase += 0.008 + p.baseSpeed * 0.005;

                // 風の影響
                p.x += windForce * p.windSensitivity;

                // 落下
                p.y += p.baseSpeed * speedMod;

                // 回転・tumble（風が強いと回転も加速）
                p.rotation += p.rotationSpeed + windForce * 0.005;
                p.tumble += p.tumbleSpeed;

                // 画面外 → リセット（上から再登場）
                if (p.y > canvas.height + 30) {
                    p.y = -20;
                    p.x = Math.random() * canvas.width;
                }
                if (p.x < -30) p.x = canvas.width + 20;
                if (p.x > canvas.width + 30) p.x = -20;

                const color = PETAL_COLORS[p.colorIndex]!;
                ctx.globalAlpha = p.opacity;

                drawSakuraPetal(
                    ctx, p.x, p.y, p.size,
                    p.rotation, p.tumble,
                    color.fill, color.accent,
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
