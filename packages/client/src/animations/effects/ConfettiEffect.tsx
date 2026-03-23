/**
 * ConfettiEffect — canvas-confetti を使用した紙吹雪エフェクト
 *
 * party テーマの正解演出に使用。
 * canvas-confetti ライブラリで高品質な紙吹雪を描画する。
 */

import { useEffect } from "react";
import confetti from "canvas-confetti";

const DURATION_MS = 2500;

export function ConfettiEffect() {
    useEffect(() => {
        const end = Date.now() + DURATION_MS;

        // 初回ドーンと打ち上げ
        confetti({
            particleCount: 60,
            spread: 80,
            origin: { x: 0.5, y: 0.5 },
            colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#FFD93D", "#C9B1FF", "#FF9FF3"],
            startVelocity: 30,
        });

        // 左右から継続的に紙吹雪を放出
        const frame = () => {
            confetti({
                particleCount: 4,
                angle: 60,
                spread: 70,
                origin: { x: 0, y: 0.6 },
                colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#FFD93D", "#C9B1FF", "#FF9FF3"],
            });
            confetti({
                particleCount: 4,
                angle: 120,
                spread: 70,
                origin: { x: 1, y: 0.6 },
                colors: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#FFD93D", "#C9B1FF", "#FF9FF3"],
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };

        frame();
    }, []);

    // canvas-confetti は自前の Canvas を body に追加するため、コンポーネントは null を返す
    return null;
}
