/**
 * InvitationBanner — 他のルームからの招待通知バナー
 *
 * 他のルームのホストから招待を受信した際に表示するフローティングバナー。
 * 一定時間（INVITE_BANNER_AUTO_DISMISS_MS）後に自動消去される。
 * 「参加する」をクリックすると現在のルームを退出し、招待元ルームへ遷移する。
 */

import { useEffect, useRef } from "react";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, INVITE_BANNER_AUTO_DISMISS_MS } from "@self-intro-quiz/shared";
import { clearSession } from "../lib/sessionPersistence.js";
import { useNavigate } from "react-router";

export function InvitationBanner() {
    const invitations = useRoomStore((s) => s.receivedInvitations);
    const dismissInvitation = useRoomStore((s) => s.dismissInvitation);
    const navigate = useNavigate();
    const theme = useAnimationTheme();

    // 自動消去タイマー管理
    const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    useEffect(() => {
        const timers = timersRef.current;

        for (let i = 0; i < invitations.length; i++) {
            const inv = invitations[i];
            if (!inv) continue;
            const key = `${inv.fromRoomCode}-${i}`;

            if (!timers.has(key)) {
                const timer = setTimeout(() => {
                    useRoomStore.getState().dismissInvitation(i);
                    timers.delete(key);
                }, INVITE_BANNER_AUTO_DISMISS_MS);
                timers.set(key, timer);
            }
        }

        return () => {
            for (const timer of timers.values()) {
                clearTimeout(timer);
            }
            timers.clear();
        };
    }, [invitations]);

    if (invitations.length === 0) return null;

    const handleJoin = (targetRoomCode: string, index: number) => {
        // バナーを即座に消す
        dismissInvitation(index);
        // ニックネームを退出前に取得（招待先ルームで再利用するため）
        const currentNickname = useRoomStore.getState().nickname;
        // 退出イベント送信 + セッションクリア + ストアリセット
        socket.emit(C2S_EVENTS.ROOM_LEAVE);
        clearSession();
        useRoomStore.getState().reset();
        useQuizStore.getState().reset();
        // React Router の navigate() だと RoomPage の <Navigate> リダイレクトと競合するため、
        // window.location で直接遷移する。
        // ニックネームをクエリパラメータで渡し、参加ページで自動入力 → 自動参加する
        const params = currentNickname ? `?nickname=${encodeURIComponent(currentNickname)}` : "";
        window.location.href = `/join/${targetRoomCode}${params}`;
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {invitations.map((inv, index) => (
                <div
                    key={`${inv.fromRoomCode}-${index}`}
                    className={`w-80 animate-fade-in rounded-xl ${theme.colors.cardBg} ${theme.colors.cardBorder} border p-4 shadow-lg`}
                >
                    <div className="mb-2 flex items-start justify-between">
                        <p className={`text-xs font-semibold ${theme.colors.textAccent}`}>
                            📨 ルーム招待
                        </p>
                        <button
                            onClick={() => dismissInvitation(index)}
                            className={`-mt-1 text-lg leading-none ${theme.colors.textSecondary} hover:opacity-70`}
                            aria-label="閉じる"
                        >
                            ×
                        </button>
                    </div>
                    <p className={`mb-1 text-sm font-bold ${theme.colors.textPrimary}`}>
                        {inv.senderNickname} さんからの招待
                    </p>
                    <p className={`mb-1 text-xs ${theme.colors.textSecondary}`}>
                        ルーム{" "}
                        {inv.fromRoomName ? (
                            <><span className="font-bold">{inv.fromRoomName}</span>{" "}(<span className="font-mono font-bold tracking-wider">{inv.fromRoomCode}</span>)</>
                        ) : (
                            <span className="font-mono font-bold tracking-wider">{inv.fromRoomCode}</span>
                        )}
                        （{inv.participantCount}人が参加中）
                    </p>
                    <p className={`mb-3 text-sm ${theme.colors.textSecondary}`}>
                        「{inv.message}」
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleJoin(inv.fromRoomCode, index)}
                            className={`flex-1 rounded-lg ${theme.colors.buttonPrimary} px-3 py-1.5 text-sm font-medium text-white transition ${theme.colors.buttonPrimaryHover}`}
                        >
                            参加する
                        </button>
                        <button
                            onClick={() => dismissInvitation(index)}
                            className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${theme.colors.buttonGhost}`}
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
