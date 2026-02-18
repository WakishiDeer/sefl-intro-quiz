/**
 * ResultView — 最終結果画面
 *
 * 全問終了後にスコアボードを表示する。
 */

import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS } from "@self-intro-quiz/shared";
import { Scoreboard } from "./Scoreboard.js";

export function ResultView() {
  const isHost = useRoomStore((s) => s.isHost);
  const finalScores = useQuizStore((s) => s.finalScores);

  const handleBackToLobby = () => {
    socket.emit(C2S_EVENTS.ROOM_BACK_TO_LOBBY);
  };

  const handleCloseRoom = () => {
    if (confirm("ルームを閉じますか？")) {
      socket.emit(C2S_EVENTS.ROOM_CLOSE);
    }
  };

  // 1位を取得
  const winner = finalScores[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-indigo-900">🏆 結果発表</h1>
        {winner && (
          <p className="mt-2 text-lg text-gray-600">
            優勝: <span className="font-bold text-indigo-700">{winner.nickname}</span>
            <span className="ml-2 font-mono">{winner.score}pt</span>
          </p>
        )}
      </div>

      <Scoreboard scores={finalScores} />

      {isHost && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleBackToLobby}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700"
          >
            ロビーに戻る
          </button>
          <button
            onClick={handleCloseRoom}
            className="rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-700"
          >
            ルームを閉じる
          </button>
        </div>
      )}
    </div>
  );
}
