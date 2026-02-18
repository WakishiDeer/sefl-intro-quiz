/**
 * useTimer — カウントダウンタイマー Hook
 *
 * サーバの timerEndsAt から残り時間を requestAnimationFrame で計算する。
 * ±1秒のズレは許容（NTP 同期は行わない）。
 */

import { useState, useEffect, useCallback } from "react";

/**
 * @param timerEndsAt - タイマー終了時刻 (Unix timestamp ms)。null の場合タイマー停止
 * @returns 残り秒数（0 以上の整数）
 */
export function useTimer(timerEndsAt: number | null): number {
    const [remaining, setRemaining] = useState(0);

    const calculate = useCallback(() => {
        if (timerEndsAt === null) return 0;
        return Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
    }, [timerEndsAt]);

    useEffect(() => {
        if (timerEndsAt === null) {
            setRemaining(0);
            return;
        }

        setRemaining(calculate());

        let rafId: number;
        const tick = () => {
            const newRemaining = calculate();
            setRemaining(newRemaining);

            if (newRemaining > 0) {
                rafId = requestAnimationFrame(tick);
            }
        };

        rafId = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(rafId);
        };
    }, [timerEndsAt, calculate]);

    return remaining;
}
