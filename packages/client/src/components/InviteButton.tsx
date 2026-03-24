/**
 * InviteButton — ルーム招待送信ボタン + インラインフォーム
 *
 * ロビー・クイズ中など任意のフェーズで使い回せるコンポーネント。
 * ボタンをクリックするとメッセージ入力フォームが展開され、
 * 送信後はクールダウン期間中ボタンが無効化される。
 */

import { useState, useCallback } from "react";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, INVITE_MAX_MESSAGE_LENGTH, INVITE_COOLDOWN_MS } from "@self-intro-quiz/shared";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface InviteButtonProps {
    /** コンパクト表示（サイドバー等の狭い領域用） */
    compact?: boolean;
}

export function InviteButton({ compact = false }: InviteButtonProps) {
    const [showForm, setShowForm] = useState(false);
    const [message, setMessage] = useState("");
    const [cooldownEnd, setCooldownEnd] = useState(0);
    const [sending, setSending] = useState(false);
    const theme = useAnimationTheme();

    const isCooldown = Date.now() < cooldownEnd;

    const handleSend = useCallback(() => {
        if (!message.trim() || sending) return;
        setSending(true);
        socket.emit(C2S_EVENTS.ROOM_INVITE, { message: message.trim() });
        setMessage("");
        setShowForm(false);
        setSending(false);
        setCooldownEnd(Date.now() + INVITE_COOLDOWN_MS);
    }, [message, sending]);

    if (!showForm) {
        return (
            <button
                onClick={() => setShowForm(true)}
                disabled={isCooldown}
                className={`w-full rounded-lg border px-4 ${compact ? "py-1.5 text-xs" : "py-2.5 text-sm"} font-medium transition ${theme.colors.buttonGhost} disabled:cursor-not-allowed disabled:opacity-50`}
            >
                📨 {compact ? "招待を送る" : "他のルームに招待を送る"}
            </button>
        );
    }

    return (
        <div className={`space-y-2 rounded-lg border p-3 ${theme.colors.cardBorder}`}>
            <label className={`block text-xs font-medium ${theme.colors.labelText}`}>
                招待メッセージ
            </label>
            <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={INVITE_MAX_MESSAGE_LENGTH}
                placeholder="例: 旅行好きが集まってるよ！一緒に語ろう"
                className={`w-full rounded-lg px-3 py-2 text-sm ${theme.colors.inputField} ${theme.colors.inputFocus}`}
            />
            <div className="flex gap-2">
                <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className={`flex-1 rounded-lg ${theme.colors.buttonAccent} px-3 py-2 text-sm font-medium text-white transition ${theme.colors.buttonAccentHover} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                    送信
                </button>
                <button
                    onClick={() => { setShowForm(false); setMessage(""); }}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${theme.colors.buttonGhost}`}
                >
                    キャンセル
                </button>
            </div>
        </div>
    );
}
