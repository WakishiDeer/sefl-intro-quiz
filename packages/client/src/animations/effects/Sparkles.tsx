/**
 * Sparkles — キラキラエフェクト（fun テーマの正解演出）
 *
 * CSS アニメーションで軽量なスパークルを表示する。
 * 一定時間後に自動で非表示になる。
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** スパークル1個分のデータ */
interface Spark {
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
}

const SPARK_COUNT = 20;
const DURATION_MS = 1800;

export function Sparkles() {
    const [visible, setVisible] = useState(true);
    const [sparks] = useState<Spark[]>(() =>
        Array.from({ length: SPARK_COUNT }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 6 + Math.random() * 12,
            delay: Math.random() * 0.5,
        })),
    );

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), DURATION_MS);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return createPortal(
        <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
            {sparks.map((s) => (
                <span
                    key={s.id}
                    className="absolute animate-sparkle rounded-full bg-yellow-300 shadow-lg shadow-yellow-300/50"
                    style={{
                        left: `${s.x}%`,
                        top: `${s.y}%`,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                    }}
                />
            ))}
        </div>,
        document.body,
    );
}
