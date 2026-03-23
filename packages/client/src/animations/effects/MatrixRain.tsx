/**
 * MatrixRain — Canvas ベースのマトリックスレイン効果
 *
 * cyber テーマの ambient エフェクトとして使用。
 * ターミナルに流れるコード / ハッカー画面風のカタカナ・英数字の雨を描画する。
 * requestAnimationFrame でパフォーマンス最適化済み。
 */

import { useEffect, useRef } from "react";

/** マトリックスレイン用のパラメータ */
export interface MatrixRainConfig {
    /** 文字色（メイン） */
    color: string;
    /** 文字色（ハイライト・先頭） */
    highlightColor: string;
    /** 列の文字サイズ (px) */
    fontSize: number;
    /** 落下速度の係数 (1.0 = 標準) */
    speed: number;
    /** 全体の不透明度 (0-1) */
    opacity: number;
    /** フェードの強さ — 背景の塗りつぶし alpha (0-1)。低いほど残像が長い */
    fadeAlpha: number;
}

interface Props {
    config: MatrixRainConfig;
}

/**
 * 使用する文字セット: カタカナ + 数字 + 記号
 * サイバーパンク感を演出するために半角カタカナ風の文字も含む
 */
const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ<>{}[]|/\\=+*&^%$#@!?";

export function MatrixRain({ config }: Props) {
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

        const columns = Math.floor(canvas.width / config.fontSize);
        /** 各列の現在の y 位置（文字数単位） */
        const drops: number[] = Array.from(
            { length: columns },
            () => Math.random() * -50,
        );

        let animId: number;

        function animate() {
            if (!ctx || !canvas) return;

            // フェード効果: 前フレームをうっすら塗りつぶして残像を作る
            ctx.fillStyle = `rgba(0, 0, 0, ${config.fadeAlpha})`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.font = `${config.fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const charIndex = Math.floor(Math.random() * CHARS.length);
                const char = CHARS[charIndex]!;

                const x = i * config.fontSize;
                const y = drops[i]! * config.fontSize;

                // 先頭文字はハイライトカラー、それ以外はメインカラー
                if (Math.random() > 0.92) {
                    ctx.fillStyle = config.highlightColor;
                    ctx.globalAlpha = config.opacity;
                } else {
                    ctx.fillStyle = config.color;
                    ctx.globalAlpha = config.opacity * (0.3 + Math.random() * 0.7);
                }

                ctx.fillText(char, x, y);

                // 画面下端に達したらランダムにリセット
                if (y > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }

                drops[i]! += config.speed * (0.5 + Math.random() * 0.5);
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
