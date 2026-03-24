/**
 * ReactionParticles — リアクションパーティクルのフローティング表示
 *
 * 受信したリアクション（絵文字・テキスト）を画面下部から浮き上がるパーティクルとして描画する。
 * CSS アニメーションで上昇 + フェードアウトし、終了後に自動削除される。
 */

import { useEffect, useCallback } from "react";
import { useReactionStore } from "../../stores/useReactionStore";
import type { ReactionParticle } from "../../stores/useReactionStore";
import { REACTION_PARTICLE_DURATION_MS } from "@self-intro-quiz/shared";

/** パーティクル1件のレンダリング */
function Particle({ particle, onRemove }: { particle: ReactionParticle; onRemove: (key: string) => void }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(particle.key);
        }, REACTION_PARTICLE_DURATION_MS);
        return () => clearTimeout(timer);
    }, [particle.key, onRemove]);

    const isEmoji = particle.type === "emoji";
    // 各パーティクルに異なる横揺れ量を設定（-20px 〜 +20px）
    const sway = (particle.x - 0.5) * 40;

    return (
        <div
            className="pointer-events-none absolute animate-reaction-float"
            style={{
                left: `${particle.x * 100}%`,
                bottom: "80px",
                animationDuration: `${REACTION_PARTICLE_DURATION_MS}ms`,
                "--reaction-sway": `${sway}px`,
            } as React.CSSProperties}
            aria-hidden="true"
        >
            <div className="flex flex-col items-center gap-0.5">
                {isEmoji ? (
                    <span className="text-3xl drop-shadow-md">{particle.display}</span>
                ) : particle.mono ? (
                    <span className="whitespace-nowrap rounded bg-black/85 px-3 py-1 font-mono text-sm font-bold text-green-400 shadow-lg shadow-green-500/20 backdrop-blur-sm border border-green-500/30">
                        {particle.display}
                    </span>
                ) : (
                    <span className="whitespace-nowrap rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-gray-800 shadow-md backdrop-blur-sm">
                        {particle.display}
                    </span>
                )}
                <span className="text-[10px] font-medium text-gray-500/80 drop-shadow-sm">
                    {particle.senderNickname}
                </span>
            </div>
        </div>
    );
}

/**
 * リアクションパーティクルのコンテナ。
 * RoomPage のルートに配置し、全画面に対してパーティクルをオーバーレイ表示する。
 */
export function ReactionParticles() {
    const particles = useReactionStore((s) => s.particles);
    const removeParticle = useReactionStore((s) => s.removeParticle);

    const handleRemove = useCallback(
        (key: string) => removeParticle(key),
        [removeParticle],
    );

    if (particles.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
            {particles.map((p) => (
                <Particle key={p.key} particle={p} onRemove={handleRemove} />
            ))}
        </div>
    );
}
