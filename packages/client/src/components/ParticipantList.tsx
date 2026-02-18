/**
 * ParticipantList — 参加者一覧コンポーネント
 *
 * ロビーやサイドバーで参加者の状態を表示する。
 */

import { useRoomStore } from "../stores/useRoomStore.js";

export function ParticipantList() {
  const participants = useRoomStore((s) => s.participants);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
        参加者 ({participants.length})
      </h3>
      <ul className="space-y-1">
        {participants.map((p) => (
          <li
            key={p.nickname}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
              p.isConnected ? "bg-white" : "bg-gray-100 opacity-60"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  p.isConnected ? "bg-green-400" : "bg-gray-400"
                }`}
              />
              <span className="font-medium">{p.nickname}</span>
              {p.isHost && (
                <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                  Host
                </span>
              )}
            </div>
            <div>
              {p.hasProfile ? (
                <span className="text-green-600">✓</span>
              ) : (
                <span className="text-gray-400">未入力</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
