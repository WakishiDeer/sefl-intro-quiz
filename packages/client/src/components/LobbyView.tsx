/**
 * LobbyView — ロビー画面
 *
 * プロフィール入力・参加者一覧・クイズ生成ボタンを表示する。
 */

import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS } from "@self-intro-quiz/shared";
import { ProfileForm } from "./ProfileForm.js";
import { ParticipantList } from "./ParticipantList.js";
import { RoomCodeDisplay } from "./RoomCodeDisplay.js";

export function LobbyView() {
  const roomCode = useRoomStore((s) => s.roomCode);
  const isHost = useRoomStore((s) => s.isHost);
  const phase = useRoomStore((s) => s.phase);
  const isGenerating = useQuizStore((s) => s.isGenerating);
  const isReady = useQuizStore((s) => s.isReady);
  const generateError = useQuizStore((s) => s.generateError);

  const handleGenerate = () => {
    socket.emit(C2S_EVENTS.QUIZ_GENERATE);
  };

  const handleStartQuiz = () => {
    socket.emit(C2S_EVENTS.QUIZ_NEXT_QUESTION);
  };

  const handleCloseRoom = () => {
    if (confirm("ルームを閉じますか？全員が退出します。")) {
      socket.emit(C2S_EVENTS.ROOM_CLOSE);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-8">
      {roomCode && <RoomCodeDisplay roomCode={roomCode} />}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 左: プロフィール入力 */}
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="mb-4 text-lg font-bold text-gray-800">
            自己紹介を入力
          </h2>
          {phase === "lobby" ? (
            <ProfileForm />
          ) : (
            <div className="text-center text-gray-500 py-8">
              {isGenerating && (
                <div>
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                  <p>クイズを生成中...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右: 参加者一覧 */}
        <div className="rounded-xl bg-white p-5 shadow">
          <ParticipantList />

          {/* Host のみ: 生成 / 開始 / 閉じるボタン */}
          {isHost && (
            <div className="mt-4 space-y-2">
              {phase === "lobby" && (
                <button
                  onClick={handleGenerate}
                  className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700"
                >
                  🎯 クイズを生成する
                </button>
              )}

              {isReady && (
                <button
                  onClick={handleStartQuiz}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white transition hover:bg-indigo-700 animate-pulse"
                >
                  🚀 クイズを開始する
                </button>
              )}

              {generateError && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  <p>{generateError}</p>
                  <button
                    onClick={handleGenerate}
                    className="mt-1 text-red-700 underline hover:no-underline"
                  >
                    再試行
                  </button>
                </div>
              )}

              <button
                onClick={handleCloseRoom}
                className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                ルームを閉じる
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
