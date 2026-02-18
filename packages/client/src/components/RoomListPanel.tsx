/**
 * RoomListPanel — ルーム一覧パネルコンポーネント
 *
 * Join ページに表示し、既存ルームの一覧と参加者を確認できるようにする。
 * ルームをクリックするとルームコードが自動入力される。
 */

import type { RoomSummary, RoomPhase } from "@self-intro-quiz/shared";

interface RoomListPanelProps {
    /** 表示するルーム一覧 */
    rooms: RoomSummary[];
    /** ルーム選択時のコールバック（ルームコードを渡す） */
    onSelectRoom: (code: string) => void;
}

/** フェーズに応じたバッジの色とラベルを返す */
function phaseBadge(phase: RoomPhase): { label: string; className: string } {
    switch (phase) {
        case "lobby":
            return { label: "参加可能", className: "bg-green-100 text-green-700" };
        case "generating":
            return { label: "生成中", className: "bg-blue-100 text-blue-700" };
        case "playing":
            return { label: "プレイ中", className: "bg-yellow-100 text-yellow-700" };
        case "revealing":
            return { label: "解答中", className: "bg-yellow-100 text-yellow-700" };
        case "finished":
            return { label: "終了", className: "bg-gray-100 text-gray-500" };
    }
}

export function RoomListPanel({ rooms, onSelectRoom }: RoomListPanelProps) {
    if (rooms.length === 0) {
        return (
            <div className="rounded-xl bg-white p-6 shadow-lg text-center">
                <p className="text-sm text-gray-500">
                    現在アクティブなルームはありません
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                ルーム一覧（{rooms.length}）
            </h2>
            <ul className="space-y-2">
                {rooms.map((room) => {
                    const badge = phaseBadge(room.phase);
                    const isJoinable = room.phase === "lobby";

                    return (
                        <li key={room.code}>
                            <button
                                type="button"
                                onClick={() => onSelectRoom(room.code)}
                                className={`w-full rounded-xl bg-white p-4 shadow text-left transition ${
                                    isJoinable
                                        ? "hover:ring-2 hover:ring-indigo-300 cursor-pointer"
                                        : "opacity-70 cursor-default"
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-lg font-bold text-indigo-900 tracking-wider">
                                            {room.code}
                                        </span>
                                        <span
                                            className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}
                                        >
                                            {badge.label}
                                        </span>
                                    </div>
                                    <span className="text-sm text-gray-500">
                                        {room.participantCount}/{room.maxParticipants}人
                                    </span>
                                </div>

                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                    <span>Host:</span>
                                    <span className="font-medium text-gray-700">
                                        {room.hostNickname}
                                    </span>
                                </div>

                                <div className="mt-1 flex flex-wrap gap-1">
                                    {room.participants.map((p) => (
                                        <span
                                            key={p.nickname}
                                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                                                p.isConnected
                                                    ? "bg-gray-100 text-gray-700"
                                                    : "bg-gray-50 text-gray-400"
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-1.5 w-1.5 rounded-full ${
                                                    p.isConnected
                                                        ? "bg-green-400"
                                                        : "bg-gray-300"
                                                }`}
                                            />
                                            {p.nickname}
                                        </span>
                                    ))}
                                </div>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
