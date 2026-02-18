/**
 * useToastStore — トースト通知の Zustand ストア
 *
 * 画面上にフィードバックメッセージを一時的に表示するための状態管理。
 * showToast() を呼ぶと指定時間後に自動消去される。
 */

import { create } from "zustand";

/** トースト表示のデフォルト時間（ms） */
const DEFAULT_TOAST_DURATION_MS = 4000;

interface ToastState {
    /** 現在表示中のメッセージ。null なら非表示 */
    message: string | null;

    /** トースト通知を表示する。duration ms 後に自動消去 */
    showToast: (message: string, duration?: number) => void;

    /** トースト通知を即時消去する */
    dismissToast: () => void;
}

/** 自動消去用タイマー ID */
let dismissTimer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastState>((set) => ({
    message: null,

    showToast: (message, duration = DEFAULT_TOAST_DURATION_MS) => {
        // 既存タイマーをクリア（連続呼び出し対応）
        if (dismissTimer !== null) {
            clearTimeout(dismissTimer);
        }

        set({ message });

        dismissTimer = setTimeout(() => {
            set({ message: null });
            dismissTimer = null;
        }, duration);
    },

    dismissToast: () => {
        if (dismissTimer !== null) {
            clearTimeout(dismissTimer);
            dismissTimer = null;
        }
        set({ message: null });
    },
}));
