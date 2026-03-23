/**
 * AmbientParticles — Canvas ベースの常時浮遊パーティクル
 *
 * テーマごとに形状・色・動きをパラメータで制御する。
 * requestAnimationFrame でパフォーマンスを最適化し、
 * パーティクル数を制限して低スペック端末でもスムーズに動作する。
 */

import { useEffect, useRef } from "react";

/** テーマが AmbientParticles に渡すパラメータ */
export interface AmbientConfig {
    /** パーティクルの色配列 */
    colors: string[];
    /** パーティクル数 */
    count: number;
    /** パーティクルの最小サイズ (px) */
    minSize: number;
    /** パーティクルの最大サイズ (px) */
    maxSize: number;
    /** 移動速度の係数 (1.0 = 標準) */
    speed: number;
    /**
     * パーティクルの形状
     * - "circle": 円
     * - "square": 四角（デジタル風）
     * - "star": 星形（キラキラ風）
     * - "petal": 花びら風の楕円
     */
    shape: "circle" | "square" | "star" | "petal";
    /** 明滅するか */
    twinkle: boolean;
    /** 移動方向: "up" = 上昇, "down" = 落下, "float" = ランダム浮遊 */
    direction: "up" | "down" | "float";
    /** 全体の不透明度 (0-1) */
    opacity: number;
}

interface Particle {
    x: number;
    y: number;
    size: number;
    color: string;
    vx: number;
    vy: number;
    opacity: number;
    /** アニメーションの位相（明滅・回転用） */
    phase: number;
}

/** 星形を描画する */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
    const spikes = 4;
    const outerR = size;
    const innerR = size * 0.4;
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

/** 花びら風の楕円を描画する */
function drawPetal(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, phase: number) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(phase);
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

interface Props {
    config: AmbientConfig;
}

export function AmbientParticles({ config }: Props) {
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

        // パーティクルの初期化
        const particles: Particle[] = Array.from({ length: config.count }, () => {
            const baseVy = config.direction === "up" ? -(0.2 + Math.random() * 0.5) * config.speed
                : config.direction === "down" ? (0.2 + Math.random() * 0.5) * config.speed
                : (Math.random() - 0.5) * 0.3 * config.speed;
            return {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: config.minSize + Math.random() * (config.maxSize - config.minSize),
                color: config.colors[Math.floor(Math.random() * config.colors.length)]!,
                vx: (Math.random() - 0.5) * 0.4 * config.speed,
                vy: baseVy,
                opacity: 0.3 + Math.random() * 0.7,
                phase: Math.random() * Math.PI * 2,
            };
        });

        let animId: number;

        function animate() {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += 0.01;

                // 画面外に出たらリセット
                if (p.y < -20) p.y = canvas.height + 10;
                if (p.y > canvas.height + 20) p.y = -10;
                if (p.x < -20) p.x = canvas.width + 10;
                if (p.x > canvas.width + 20) p.x = -10;

                const alpha = config.twinkle
                    ? p.opacity * (0.5 + 0.5 * Math.sin(p.phase * 3)) * config.opacity
                    : p.opacity * config.opacity;

                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;

                switch (config.shape) {
                    case "circle":
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                        ctx.fill();
                        break;
                    case "square":
                        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                        break;
                    case "star":
                        drawStar(ctx, p.x, p.y, p.size);
                        break;
                    case "petal":
                        drawPetal(ctx, p.x, p.y, p.size, p.phase);
                        break;
                }
            }

            animId = requestAnimationFrame(animate);
        }

        animId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, [config]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-0"
            aria-hidden="true"
        />
    );
}
