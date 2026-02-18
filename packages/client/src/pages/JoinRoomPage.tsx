/**
 * JoinRoomPage — ルーム参加ページ
 *
 * Room Code + ニックネームを入力して既存ルームに参加する。
 * URL パラメータで roomCode を受け取ることも可能。
 * アクティブなルーム一覧をリアルタイムで表示し、クリックでルームコード自動入力。
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, S2C_EVENTS, NicknameSchema, RoomCodeSchema } from "@self-intro-quiz/shared";
import type { RoomSummary, RoomListPayload } from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { RoomListPanel } from "../components/RoomListPanel.js";

export function JoinRoomPage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode?: string }>();
  const [roomCode, setRoomCode] = useState(urlRoomCode ?? "");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);

  // ルーム一覧のリアルタイム購読
  useEffect(() => {
    // Socket 接続してルーム一覧を購読
    if (!socket.connected) {
      socket.connect();
    }

    const onRoomList = (payload: RoomListPayload) => {
      setRooms(payload.rooms);
    };

    socket.on(S2C_EVENTS.ROOM_LIST, onRoomList);
    socket.emit(C2S_EVENTS.ROOM_LIST_SUBSCRIBE);

    return () => {
      socket.off(S2C_EVENTS.ROOM_LIST, onRoomList);
      socket.emit(C2S_EVENTS.ROOM_LIST_UNSUBSCRIBE);

      // ルーム参加中でなければ切断
      const { roomCode: currentRoom } = useRoomStore.getState();
      if (!currentRoom) {
        socket.disconnect();
      }
    };
  }, []);

  const handleSelectRoom = useCallback((code: string) => {
    setRoomCode(code);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codeResult = RoomCodeSchema.safeParse(roomCode.toUpperCase());
    if (!codeResult.success) {
      setError("ルームコードは英数大文字6文字です");
      return;
    }

    const nickResult = NicknameSchema.safeParse(nickname);
    if (!nickResult.success) {
      setError(nickResult.error.errors[0]?.message ?? "入力が不正です");
      return;
    }

    setIsSubmitting(true);

    if (!socket.connected) {
      socket.connect();
    }

    // 購読解除してから参加処理へ
    socket.emit(C2S_EVENTS.ROOM_LIST_UNSUBSCRIBE);

    const normalizedCode = roomCode.toUpperCase();
    useRoomStore.getState().setCredentials(normalizedCode, nickname);
    socket.emit(C2S_EVENTS.ROOM_JOIN, { roomCode: normalizedCode, nickname });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-900">ルームに参加</h1>
          <p className="mt-1 text-sm text-gray-500">
            ルームコードを入力するか、一覧からルームを選んでください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700">
              ルームコード
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="例: ABC123"
              maxLength={6}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              disabled={isSubmitting || !!urlRoomCode}
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
              ニックネーム
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2〜12文字"
              maxLength={12}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-lg focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "参加中..." : "参加する"}
          </button>
        </form>

        <RoomListPanel rooms={rooms} onSelectRoom={handleSelectRoom} />

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
