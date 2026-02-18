/**
 * Toast — トースト通知コンポーネント
 *
 * 画面上部中央にフィードバックメッセージを一時表示する。
 * useToastStore の message が非 null の間だけ表示され、
 * 自動消去またはクリックで閉じられる。
 */

import { useToastStore } from "../stores/useToastStore.js";

export function Toast() {
    const message = useToastStore((s) => s.message);
    const dismissToast = useToastStore((s) => s.dismissToast);

    if (!message) return null;

    return (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 animate-fade-in">
            <div
                role="status"
                aria-live="polite"
                onClick={dismissToast}
                className="cursor-pointer rounded-lg bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg transition-opacity hover:opacity-90"
            >
                {message}
            </div>
        </div>
    );
}
