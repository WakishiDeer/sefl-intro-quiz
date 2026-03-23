/**
 * Confetti — 紙吹雪エフェクト（party テーマの正解演出）
 *
 * Canvas を使って軽量なパーティクルアニメーションを描画する。
 * パーティクル数を抑え（最大40個）、低スペック端末でもスムーズに動作する。
 */

import { useEffect, useRef, useState } from "react";

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    rotation: number;
    rotationSpeed: number;
    opacity: number;
}

const PARTICLE_COUNT = 40;
const DURATION_MS = 1500;
const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8", "#FFD93D", "#C9B1FF", "#FF9FF3"];

export function Confetti() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => ({
            x: canvas.width / 2 + (Math.random() - 0.5) * canvas.width * 0.4,
            y: canvas.height * 0.4,
            vx: (Math.random() - 0.5) * 8,
            vy: -3 - Math.random() * 6,
            size: 4 + Math.random() * 6,
            color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            opacity: 1,
        }));

        let animId: number;
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            if (elapsed > DURATION_MS || !ctx || !canvas) return;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (const p of particles) {
                p.x += p.vx;
                p.vy += 0.15; // gravity
                p.y += p.vy;
                p.rotation += p.rotationSpeed;
                p.opacity = Math.max(0, 1 - elapsed / DURATION_MS);

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }

            animId = requestAnimationFrame(animate);
        }

        animId = requestAnimationFrame(animate);

        const hideTimer = setTimeout(() => setVisible(false), DURATION_MS);

        return () => {
            cancelAnimationFrame(animId);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!visible) return null;

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
        />
    );
}
