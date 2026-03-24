/**
 * RoomCodeDisplay — ルームコード＆ルーム名表示コンポーネント
 *
 * 大きな文字でルームコードを表示し、コピー機能を提供する。
 * ルーム名が設定されている場合はルームコードの上に表示する。
 * ホストの場合はルーム名をインライン編集できる。
 */

import { useState, useRef, useEffect } from "react";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { useRoomStore } from "../stores/useRoomStore.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, MAX_ROOM_NAME_LENGTH } from "@self-intro-quiz/shared";

interface Props {
  roomCode: string;
}

export function RoomCodeDisplay({ roomCode }: Props) {
  const [copied, setCopied] = useState(false);
  const theme = useAnimationTheme();
  const roomName = useRoomStore((s) => s.roomName);
  const isHost = useRoomStore((s) => s.isHost);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(roomName);
  const inputRef = useRef<HTMLInputElement>(null);

  // roomName が外部から変わったら editValue を同期
  useEffect(() => {
    if (!isEditing) {
      setEditValue(roomName);
    }
  }, [roomName, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // フォールバック
    }
  };

  const handleSave = () => {
    const trimmed = editValue.trim();
    socket.emit(C2S_EVENTS.ROOM_SET_NAME, { roomName: trimmed });
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(roomName);
      setIsEditing(false);
    }
  };

  return (
    <div className="text-center">
      {/* ルーム名表示・編集 */}
      {isHost ? (
        <div className="mb-1">
          {isEditing ? (
            <div className="inline-flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                maxLength={MAX_ROOM_NAME_LENGTH}
                placeholder="ルーム名を入力"
                className={`rounded-md border px-3 py-1 text-center text-sm font-medium ${theme.colors.inputField} ${theme.colors.inputFocus}`}
              />
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className={`inline-flex items-center gap-1 text-sm font-medium ${theme.colors.textSecondary} hover:opacity-70 transition`}
              title="ルーム名を編集"
            >
              {roomName ? (
                <span className={`font-bold ${theme.colors.textPrimary}`}>{roomName}</span>
              ) : (
                <span className="italic">ルーム名を設定</span>
              )}
              <span className="text-xs">✏️</span>
            </button>
          )}
        </div>
      ) : (
        roomName && (
          <p className={`mb-1 text-sm font-bold ${theme.colors.textPrimary}`}>
            {roomName}
          </p>
        )
      )}

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
