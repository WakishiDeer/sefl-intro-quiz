/**
 * RoomCodeDisplay — ルームコード表示コンポーネント
 *
 * 大きな文字でルームコードを表示し、コピー機能を提供する。
 */

import { useState } from "react";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
  roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: Props) {
  const [copied, setCopied] = useState(false);
  const theme = useAnimationTheme();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
    }
  };

  return (
    <div className="text-center">
      <p className={`text-xs font-medium ${theme.colors.textSecondary} uppercase tracking-wide`}>
        ルームコード
      </p>
      <button
        onClick={handleCopy}
        className={`mt-1 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-3xl font-mono font-bold tracking-[0.3em] shadow transition hover:shadow-md ${theme.colors.cardBg} ${theme.colors.textAccent}`}
        title="クリックでコピー"
      >
        {roomCode}
        <span className={`text-sm font-sans ${theme.colors.textSecondary}`}>
          {copied ? "✓" : "📋"}
        </span>
      </button>
    </div>
  );
}
