/**
 * Petals — 桜の花びらエフェクト（sakura テーマの正解演出）
 *
 * CSS アニメーションで花びらが舞い落ちる演出を行う。
 * 軽量で DOM ベース。花びら数を制限してパフォーマンスを維持。
 */

import { useEffect, useState } from "react";

interface Petal {
    id: number;
    x: number;
    size: number;
    delay: number;
    duration: number;
    swayAmount: number;
}

const PETAL_COUNT = 24;
const DURATION_MS = 2500;

export function Petals() {
    const [visible, setVisible] = useState(true);
    const [petals] = useState<Petal[]>(() =>
        Array.from({ length: PETAL_COUNT }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            size: 8 + Math.random() * 10,
            delay: Math.random() * 0.5,
            duration: 1.2 + Math.random() * 0.8,
            swayAmount: 15 + Math.random() * 25,
        })),
    );

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {petals.map((p) => (
                <span
                    key={p.id}
                    className="animate-petal-fall absolute"
                    style={{
                        left: `${p.x}%`,
                        top: "-5%",
                        width: p.size,
                        height: p.size,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        // CSS custom properties for sway
                        "--petal-sway": `${p.swayAmount}px`,
                    } as React.CSSProperties}
                >
                    🌸
                </span>
            ))}
        </div>
    );
}
