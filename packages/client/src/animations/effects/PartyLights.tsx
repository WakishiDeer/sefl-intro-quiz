/**
 * PartyLights — ディスコボール風ライトエフェクト
 *
 * party テーマの常時背景エフェクト。
 * 回転するカラフルなライトビームが画面を横切り、
 * ダイヤモンド型のディスコボール反射光が浮遊することで
 * クラブ / パーティー感を演出する。
 */

import { useEffect, useRef } from "react";

/* ─── ディスコ反射光のパーティクル ─── */
interface Reflection {
    x: number;
    y: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    vx: number;
    vy: number;
    opacity: number;
    pulsePhase: number;
    pulseSpeed: number;
}

/* ─── 回転するライトビーム ─── */
interface LightBeam {
    angle: number;
    angularSpeed: number;
    color: string;
    width: number;
    opacity: number;
    originX: number;
    originY: number;
}

/** 反射光のカラーパレット（パープル / ゴールド / シアン / ピンク / ブルー / エメラルド） */
const REFLECTION_COLORS = [
    "#a855f7", // purple-500
    "#fbbf24", // amber-400
    "#06b6d4", // cyan-500
    "#ec4899", // pink-500
    "#3b82f6", // blue-500
    "#10b981", // emerald-500
    "#f97316", // orange-500
];

const REFLECTION_COUNT = 28;

/** ビームの色（低透明度で画面を覆わないように制御） */
const BEAM_CONFIGS: Array<{ color: string; direction: 1 | -1 }> = [
    { color: "rgba(168, 85, 247, 0.07)", direction: 1 },
    { color: "rgba(251, 191, 36, 0.05)", direction: -1 },
    { color: "rgba(6, 182, 212, 0.05)", direction: 1 },
    { color: "rgba(236, 72, 153, 0.06)", direction: -1 },
];

export function PartyLights() {
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

        /* ── 反射ダイヤ初期化 ── */
        const reflections: Reflection[] = Array.from({ length: REFLECTION_COUNT }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 3 + Math.random() * 5,
            color: REFLECTION_COLORS[Math.floor(Math.random() * REFLECTION_COLORS.length)]!,
            rotation: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.02,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.18,
            opacity: 0.25 + Math.random() * 0.45,
            pulsePhase: Math.random() * Math.PI * 2,
            pulseSpeed: 0.015 + Math.random() * 0.025,
        }));

        /* ── ライトビーム初期化 ── */
        const beams: LightBeam[] = BEAM_CONFIGS.map((cfg, i) => ({
            angle: (Math.PI * 2 * i) / BEAM_CONFIGS.length + Math.random() * 0.5,
            angularSpeed: (0.002 + Math.random() * 0.003) * cfg.direction,
            color: cfg.color,
            width: 50 + Math.random() * 40,
            opacity: 1,
            originX: canvas.width * (0.2 + Math.random() * 0.6),
            originY: canvas.height * (0.08 + Math.random() * 0.25),
        }));

        let animId: number;

        /** ダイヤモンド形状を描画 */
        function drawDiamond(cx: number, cy: number, size: number, rotation: number) {
            if (!ctx) return;
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.6, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            /* ── ライトビーム描画 ── */
            for (const beam of beams) {
                beam.angle += beam.angularSpeed;

                const length = Math.max(canvas.width, canvas.height) * 1.5;

                ctx.save();
                ctx.globalAlpha = beam.opacity;
                ctx.translate(beam.originX, beam.originY);
                ctx.rotate(beam.angle);

                const gradient = ctx.createLinearGradient(0, 0, length, 0);
                gradient.addColorStop(0, beam.color);
                gradient.addColorStop(0.7, beam.color);
                gradient.addColorStop(1, "transparent");

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.moveTo(0, -beam.width / 2);
                ctx.lineTo(length, -beam.width * 0.08);
                ctx.lineTo(length, beam.width * 0.08);
                ctx.lineTo(0, beam.width / 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            /* ── ディスコ反射描画 ── */
            for (const r of reflections) {
                r.x += r.vx;
                r.y += r.vy;
                r.rotation += r.rotationSpeed;
                r.pulsePhase += r.pulseSpeed;

                /* 画面外ラップ */
                if (r.x < -20) r.x = canvas.width + 10;
                if (r.x > canvas.width + 20) r.x = -10;
                if (r.y < -20) r.y = canvas.height + 10;
                if (r.y > canvas.height + 20) r.y = -10;

                const pulse = 0.4 + 0.6 * Math.sin(r.pulsePhase);
                ctx.globalAlpha = r.opacity * pulse;
                ctx.fillStyle = r.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = r.color;
                drawDiamond(r.x, r.y, r.size, r.rotation);
                ctx.shadowBlur = 0;
            }

            ctx.globalAlpha = 1;
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
            style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
            }}
        />
    );
}
