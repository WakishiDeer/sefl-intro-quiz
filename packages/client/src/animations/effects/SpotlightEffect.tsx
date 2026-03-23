/**
 * SpotlightEffect — スピーチタイム演出用スポットライトエフェクト
 *
 * interviewing フェーズ突入時に表示するフルスクリーン演出。
 * ステージ登壇のように暗転 → スポットライト照射 → 名前ドーン → デコ飛散、
 * という一連のイントロアニメーション後、控えめなグローに落ち着く。
 * テーマごとにスポットライト色・デコ絵文字・演出スタイルをカスタマイズ可能。
 */

import { useEffect, useState, useMemo } from "react";

/** スポットライトの設定 */
export interface SpotlightConfig {
    /** スポットライトの中心色 (CSS color) */
    color: string;
    /** スポットライト外縁のグロー色 (CSS color) */
    glowColor: string;
    /** 暗幕の色 (CSS rgba) */
    overlayColor: string;
    /** 名前テキストの色 (Tailwind クラス) */
    nameColor: string;
    /** 名前テキストのグロー (CSS text-shadow) */
    nameGlow: string;
    /** バッジ背景色 (Tailwind クラス) */
    badgeClass: string;
    /** デコレーション絵文字（周囲に飛散する） */
    decorEmojis: string[];
    /** デコレーション数 */
    decorCount: number;
    /** 光線のスタイル */
    style: "soft" | "hard" | "beam";
}

/** 飛散するデコレーション要素 */
interface DecoItem {
    id: number;
    emoji: string;
    /** 出現位置 (%) */
    x: number;
    y: number;
    /** 移動先のオフセット */
    dx: number;
    dy: number;
    /** サイズ (rem) */
    size: number;
    /** アニメーション遅延 (s) */
    delay: number;
    /** 回転角 (deg) */
    rotate: number;
}

const DEFAULT_CONFIG: SpotlightConfig = {
    color: "rgba(255, 255, 255, 0.9)",
    glowColor: "rgba(255, 255, 255, 0.3)",
    overlayColor: "rgba(0, 0, 0, 0.6)",
    nameColor: "text-white",
    nameGlow: "0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,255,255,0.4)",
    badgeClass: "bg-amber-400",
    decorEmojis: ["✨", "🎤", "⭐"],
    decorCount: 12,
    style: "soft",
};

export function SpotlightEffect({
    config: userConfig,
    subjectName,
}: {
    config?: Partial<SpotlightConfig>;
    subjectName: string;
}) {
    const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...userConfig }), [userConfig]);

    // アニメーションフェーズ: dark → spotlight → name → decos → settled
    const [phase, setPhase] = useState<"dark" | "spotlight" | "name" | "settled">("dark");

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("spotlight"), 200);
        const t2 = setTimeout(() => setPhase("name"), 700);
        const t3 = setTimeout(() => setPhase("settled"), 2200);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    // デコレーション要素を生成—最初から広がった位置に配置し、その場でポップインさせる
    const decos = useMemo<DecoItem[]>(() =>
        Array.from({ length: config.decorCount }, (_, i) => {
            const angle = (i / config.decorCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
            const radius = 22 + Math.random() * 18;
            return {
                id: i,
                emoji: config.decorEmojis[i % config.decorEmojis.length]!,
                // 最初から広がった位置に配置
                x: 50 + Math.cos(angle) * radius,
                y: 42 + Math.sin(angle) * radius * 0.7,
                // さらに外側へ弾け飛ぶオフセット
                dx: Math.cos(angle) * (15 + Math.random() * 10),
                dy: Math.sin(angle) * (12 + Math.random() * 8),
                size: 1.4 + Math.random() * 1.2,
                delay: 0.05 * i,
                rotate: -30 + Math.random() * 60,
            };
        }),
    [config.decorCount, config.decorEmojis]);

    // スポットライトグラデーション
    const spotlightBg = (() => {
        const cx = 50;
        const cy = 42;
        switch (config.style) {
            case "hard":
                return `radial-gradient(circle at ${cx}% ${cy}%, ${config.color} 0%, ${config.glowColor} 18%, transparent 30%)`;
            case "beam":
                return `radial-gradient(ellipse 35% 60% at ${cx}% ${cy}%, ${config.color} 0%, ${config.glowColor} 20%, transparent 45%)`;
            case "soft":
            default:
                return `radial-gradient(circle at ${cx}% ${cy}%, ${config.color} 0%, ${config.glowColor} 22%, transparent 40%)`;
        }
    })();

    // ビーム光線（上から降り注ぐ）
    const beamBg = config.style === "beam"
        ? `linear-gradient(180deg, ${config.color} 0%, ${config.glowColor} 25%, transparent 55%)`
        : undefined;

    return (
        <div
            className="pointer-events-none fixed inset-0 z-5 overflow-hidden"
            aria-hidden="true"
        >
            {/* 暗幕 — ぱっと暗転 */}
            <div
                className="absolute inset-0 transition-opacity duration-500"
                style={{
                    backgroundColor: phase === "dark" ? "transparent" : undefined,
                    background: phase !== "dark"
                        ? `radial-gradient(circle at 50% 42%, transparent 15%, ${config.overlayColor} 50%)`
                        : undefined,
                    opacity: phase === "settled" ? 0.35 : phase !== "dark" ? 1 : 0,
                }}
            />

            {/* スポットライト光源 */}
            <div
                className="absolute inset-0 transition-all duration-700"
                style={{
                    background: spotlightBg,
                    opacity: phase === "dark" ? 0 : phase === "settled" ? 0.25 : 1,
                    transform: phase === "spotlight" ? "scale(0.6)" : "scale(1)",
                }}
            />

            {/* ビーム（beam スタイルのみ） */}
            {beamBg && phase !== "dark" && (
                <div
                    className="absolute inset-0 animate-spotlight-beam"
                    style={{
                        background: beamBg,
                        clipPath: "polygon(43% 0%, 57% 0%, 64% 55%, 36% 55%)",
                        opacity: phase === "settled" ? 0.25 : 0.7,
                    }}
                />
            )}

            {/* 名前ドーン！ */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {/* ガラスパネル背景 — テキスト視認性を確保 */}
                <div
                    className={`rounded-2xl border border-white/15 bg-black/25 px-10 py-8 shadow-2xl backdrop-blur-md transition-all duration-700 ${
                        phase === "name" || phase === "settled"
                            ? "scale-100 opacity-100"
                            : "scale-90 opacity-0"
                    }`}
                >
                    {/* バッジ */}
                    <div
                        className={`mb-3 text-center transition-all duration-500 ${
                            phase === "name" || phase === "settled"
                                ? "translate-y-0 scale-100 opacity-100"
                                : "-translate-y-8 scale-50 opacity-0"
                        }`}
                    >
                        <span className={`inline-block rounded-full px-5 py-1.5 text-sm font-bold text-white shadow-lg ${config.badgeClass}`}>
                            🎤 スピーチタイム
                        </span>
                    </div>

                    {/* 名前 */}
                    <div
                        className={`transition-all ${
                            phase === "name"
                                ? "duration-500 scale-110 opacity-100"
                                : phase === "settled"
                                  ? "duration-700 scale-100 opacity-100"
                                  : "duration-300 scale-150 opacity-0"
                        }`}
                    >
                        <h2
                            className={`text-center text-4xl font-black tracking-wide md:text-5xl ${config.nameColor}`}
                            style={{ textShadow: config.nameGlow }}
                        >
                            {subjectName}
                        </h2>
                    </div>

                    {/* サブテキスト */}
                    <p
                        className={`mt-3 text-center text-sm font-medium text-white/80 transition-all duration-700 ${
                            phase === "settled" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                        }`}
                    >
                        みんなが気になっています！1分間どうぞ！
                    </p>
                </div>
            </div>

            {/* デコレーション飛散 */}
            {(phase === "name" || phase === "settled") && decos.map((d) => (
                <div
                    key={d.id}
                    className="animate-spotlight-deco absolute"
                    style={{
                        left: `${d.x}%`,
                        top: `${d.y}%`,
                        fontSize: `${d.size}rem`,
                        // カスタムプロパティでアニメーション先を指定
                        "--deco-dx": `${d.dx}vmin`,
                        "--deco-dy": `${d.dy}vmin`,
                        "--deco-rotate": `${d.rotate}deg`,
                        animationDelay: `${d.delay}s`,
                    } as React.CSSProperties}
                >
                    {d.emoji}
                </div>
            ))}
        </div>
    );
}

