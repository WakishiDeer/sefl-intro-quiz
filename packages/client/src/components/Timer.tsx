/**
 * Timer — カウントダウンタイマー表示
 *
 * テーマ対応の緊急演出クラスを適用。
 */

import { useTimer } from "../hooks/useTimer.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
  timerEndsAt: number | null;
}

export function Timer({ timerEndsAt }: Props) {
  const remaining = useTimer(timerEndsAt);
  const theme = useAnimationTheme();

  const isUrgent = remaining <= 5;
  const urgencyClass = isUrgent && theme.effects.timerUrgencyClass
    ? theme.effects.timerUrgencyClass
    : "";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-2xl font-bold tabular-nums ${
        isUrgent
          ? `bg-red-100 text-red-600 animate-pulse ${urgencyClass}`
          : "bg-indigo-100 text-indigo-700"
      }`}
    >
      {remaining}s
    </div>
  );
}
