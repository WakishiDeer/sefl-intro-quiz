/**
 * RoomCodeDisplay — ルームコード表示コンポーネント
 *
 * 大きな文字でルームコードを表示し、コピー機能を提供する。
 */

import { useState } from "react";

interface Props {
  roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: Props) {
  const [copied, setCopied] = useState(false);

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
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        ルームコード
      </p>
      <button
        onClick={handleCopy}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-3xl font-mono font-bold tracking-[0.3em] text-indigo-700 shadow transition hover:shadow-md"
        title="クリックでコピー"
      >
        {roomCode}
        <span className="text-sm font-sans text-gray-400">
          {copied ? "✓" : "📋"}
        </span>
      </button>
    </div>
  );
}
