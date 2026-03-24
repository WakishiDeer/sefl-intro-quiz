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

/* ─── ミラーボール設定 ─── */
const MIRROR_BALL_RADIUS = 60;
/** ミラーボール表面のタイル数（行） */
const TILE_ROWS = 10;
/** ミラーボールのゆっくりとした回転速度 */
const MIRROR_BALL_ROTATE_SPEED = 0.003;
/** ミラーボールの透明度（控えめだが存在感） */
const MIRROR_BALL_OPACITY = 0.55;

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

        /* ── ミラーボール状態 ── */
        let mirrorBallAngle = 0;

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

        /** ミラーボール球体を描画（右上に配置） */
        function drawMirrorBall(cx: number, cy: number, radius: number, angle: number) {
            if (!ctx) return;
            ctx.save();
            ctx.globalAlpha = MIRROR_BALL_OPACITY;

            // 球体のベースグラデーション（球体感を出すための明暗）
            const baseGrad = ctx.createRadialGradient(
                cx - radius * 0.3, cy - radius * 0.3, radius * 0.05,
                cx, cy, radius,
            );
            baseGrad.addColorStop(0, "rgba(220, 220, 240, 0.9)");
            baseGrad.addColorStop(0.4, "rgba(180, 180, 200, 0.7)");
            baseGrad.addColorStop(0.8, "rgba(100, 100, 130, 0.5)");
            baseGrad.addColorStop(1, "rgba(60, 60, 80, 0.3)");

            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.fillStyle = baseGrad;
            ctx.fill();

            // タイルパターン描画（球面に貼り付いたミラータイル風）
            ctx.clip(); // 球体の外にはみ出さないようにクリップ
            for (let row = 0; row < TILE_ROWS; row++) {
                const rowAngle = (Math.PI * (row + 0.5)) / TILE_ROWS - Math.PI / 2;
                const rowRadius = Math.cos(rowAngle) * radius;
                const rowY = cy + Math.sin(rowAngle) * radius;
                const tilesInRow = Math.max(4, Math.round(TILE_ROWS * 2 * Math.cos(rowAngle)));

                for (let col = 0; col < tilesInRow; col++) {
                    const colAngle = (Math.PI * 2 * col) / tilesInRow + angle;
                    const tileX = cx + Math.cos(colAngle) * rowRadius;
                    const tileSize = (radius * 2) / (TILE_ROWS * 1.8);

                    // 球面上の位置で明るさを変える（回転に連動してチラつく）
                    const facingFactor = Math.cos(colAngle - angle * 0.5) * 0.5 + 0.5;
                    const shimmer = Math.sin(colAngle * 3 + angle * 5 + row) * 0.15;
                    const brightness = 0.2 + facingFactor * 0.5 + shimmer;

                    // タイルの色（白〜薄いカラー）
                    const colorIdx = (row + col) % REFLECTION_COLORS.length;
                    const tileColor = REFLECTION_COLORS[colorIdx]!;

                    ctx.globalAlpha = MIRROR_BALL_OPACITY * brightness;
                    ctx.fillStyle = brightness > 0.55 ? tileColor : `rgba(200, 200, 220, ${brightness})`;
                    ctx.fillRect(
                        tileX - tileSize / 2,
                        rowY - tileSize / 2,
                        tileSize * 0.85,
                        tileSize * 0.85,
                    );
                }
            }

            // ハイライト光沢（球体の左上に白い反射）
            ctx.globalAlpha = 0.3;
            const shineGrad = ctx.createRadialGradient(
                cx - radius * 0.35, cy - radius * 0.35, radius * 0.02,
                cx - radius * 0.2, cy - radius * 0.2, radius * 0.5,
            );
            shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
            shineGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.fillStyle = shineGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
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

            /* ── ミラーボール描画（右上に配置） ── */
            mirrorBallAngle += MIRROR_BALL_ROTATE_SPEED;
            const ballX = canvas.width - MIRROR_BALL_RADIUS - 30;
            const ballY = MIRROR_BALL_RADIUS + 30;
            drawMirrorBall(ballX, ballY, MIRROR_BALL_RADIUS, mirrorBallAngle);

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
