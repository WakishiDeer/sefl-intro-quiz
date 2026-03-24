/**
 * ReactionBar — リアクション送信ボタンバー
 *
 * 画面下部に固定表示し、絵文字・テキスト・テーマ固有のリアクションボタンを提供する。
 * クライアント側レートリミットで連打を抑制する。
 */

import { useState, useCallback, useRef } from "react";
import { socket } from "../lib/socket";
import { useAnimationTheme } from "../animations/useAnimationTheme";
import { useRoomStore } from "../stores/useRoomStore";
import {
    C2S_EVENTS,
    DEFAULT_EMOJI_REACTIONS,
    DEFAULT_TEXT_REACTIONS,
    THEME_REACTIONS,
    REACTION_RATE_LIMIT,
    REACTION_RATE_WINDOW_MS,
} from "@self-intro-quiz/shared";
import type { ReactionDefinition, SendReactionPayload } from "@self-intro-quiz/shared";

/** クライアント側レートリミット：直近の送信タイムスタンプ */
const recentSends: number[] = [];

/**
 * リアクション送信ボタンバー。
 * RoomPage の下部に固定配置して使用する。
 */
export function ReactionBar() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isThrottled, setIsThrottled] = useState(false);
    const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const theme = useAnimationTheme();
    const animationTheme = useRoomStore((s) => s.animationTheme);
    const roomCode = useRoomStore((s) => s.roomCode);

    // テーマ固有リアクション
    const themeReactions = THEME_REACTIONS[animationTheme] ?? [];

    const handleSend = useCallback(
        (reaction: ReactionDefinition) => {
            if (!roomCode) return;

            // クライアント側レートリミットチェック
            const now = Date.now();
            const windowStart = now - REACTION_RATE_WINDOW_MS;
            // 古いタイムスタンプを除去
            while (recentSends.length > 0 && recentSends[0]! < windowStart) {
                recentSends.shift();
            }

            if (recentSends.length >= REACTION_RATE_LIMIT) {
                setIsThrottled(true);
                if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
                throttleTimerRef.current = setTimeout(() => setIsThrottled(false), 1000);
                return;
            }

            recentSends.push(now);

            const payload: SendReactionPayload = { reactionId: reaction.id };
            socket.emit(C2S_EVENTS.REACTION_SEND, payload);
        },
        [roomCode],
    );

    const toggleExpand = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pb-2 pointer-events-none">
            {/* 展開時：全リアクション表示 */}
            {isExpanded && (
                <div
                    className={`pointer-events-auto mb-2 max-w-lg w-full mx-4 rounded-2xl ${theme.colors.cardBg}/80 ${theme.colors.cardBorder} border p-3 shadow-xl backdrop-blur-md`}
                >
                    {/* テーマ固有リアクション */}
                    {themeReactions.length > 0 && (
                        <div className="mb-2">
                            <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${theme.colors.textSecondary}`}>
                                テーマ
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {themeReactions.map((r) => (
                                    <ReactionButton
                                        key={r.id}
                                        reaction={r}
                                        onSend={handleSend}
                                        disabled={isThrottled}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* テキストリアクション */}
                    <div className="mb-2">
                        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${theme.colors.textSecondary}`}>
                            テキスト
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {DEFAULT_TEXT_REACTIONS.map((r) => (
                                <ReactionButton
                                    key={r.id}
                                    reaction={r}
                                    onSend={handleSend}
                                    disabled={isThrottled}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 絵文字リアクション */}
                    <div>
                        <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wider ${theme.colors.textSecondary}`}>
                            絵文字
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {DEFAULT_EMOJI_REACTIONS.map((r) => (
                                <ReactionButton
                                    key={r.id}
                                    reaction={r}
                                    onSend={handleSend}
                                    disabled={isThrottled}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* トグルボタン + クイックアクセス絵文字 */}
            <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-white/70 backdrop-blur-md px-2 py-1 shadow-sm">
                {/* 折りたたみ時はクイックアクセス（先頭4つの絵文字） */}
                {!isExpanded && (
                    <div className="flex items-center gap-1 mr-1">
                        {DEFAULT_EMOJI_REACTIONS.slice(0, 4).map((r) => (
                            <button
                                key={r.id}
                                onClick={() => handleSend(r)}
                                disabled={isThrottled}
                                className="rounded-full p-1.5 text-xl transition-transform hover:scale-125 active:scale-90 disabled:opacity-40"
                                title={r.label}
                                aria-label={r.label}
                            >
                                {r.display}
                            </button>
                        ))}
                    </div>
                )}

                {/* 展開/折りたたみトグル */}
                <button
                    onClick={toggleExpand}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-md transition ${theme.colors.buttonGhost} border`}
                    aria-label={isExpanded ? "リアクションを閉じる" : "リアクションを開く"}
                >
                    {isExpanded ? "✕ 閉じる" : "😊 もっと"}
                </button>
            </div>
        </div>
    );
}

/** 個別のリアクションボタン */
function ReactionButton({
    reaction,
    onSend,
    disabled,
}: {
    reaction: ReactionDefinition;
    onSend: (reaction: ReactionDefinition) => void;
    disabled: boolean;
}) {
    const isEmoji = reaction.type === "emoji";

    return (
        <button
            onClick={() => onSend(reaction)}
            disabled={disabled}
            className={`transition-transform hover:scale-110 active:scale-90 disabled:opacity-40 ${
                isEmoji
                    ? "rounded-full p-1.5 text-2xl"
                    : reaction.mono
                        ? "rounded bg-black/80 px-3 py-1 font-mono text-sm font-bold text-green-400 border border-green-500/30 hover:bg-black/90 hover:shadow-green-500/20 hover:shadow-md"
                        : "rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
            }`}
            title={reaction.label}
            aria-label={reaction.label}
        >
            {reaction.display}
        </button>
    );
}
