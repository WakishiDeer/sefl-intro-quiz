/**
 * Timer — カウントダウンタイマー表示
 */

import { useTimer } from "../hooks/useTimer.js";

interface Props {
  timerEndsAt: number | null;
}

export function Timer({ timerEndsAt }: Props) {
  const remaining = useTimer(timerEndsAt);

  const isUrgent = remaining <= 5;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-2xl font-bold tabular-nums ${
        isUrgent
          ? "bg-red-100 text-red-600 animate-pulse"
          : "bg-indigo-100 text-indigo-700"
      }`}
    >
      {remaining}s
    </div>
  );
}
