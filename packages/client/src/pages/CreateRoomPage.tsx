/**
 * CreateRoomPage — ルーム作成ページ
 *
 * ニックネームを入力してルームを作成する。
 */

import { useState } from "react";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, NicknameSchema } from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { getOrCreateClientId } from "../lib/sessionPersistence.js";
import { Link } from "react-router";

export function CreateRoomPage() {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = NicknameSchema.safeParse(nickname);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "入力が不正です");
      return;
    }

    setIsSubmitting(true);

    // Socket 接続してルーム作成
    if (!socket.connected) {
      socket.connect();
    }

    useRoomStore.getState().setCredentials("", nickname);
    socket.emit(C2S_EVENTS.ROOM_CREATE, { nickname, clientId: getOrCreateClientId() });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-900">ルームを作成</h1>
          <p className="mt-1 text-sm text-gray-500">
            あなたがホストになります
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
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
            {isSubmitting ? "作成中..." : "ルームを作成"}
          </button>
        </form>

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
