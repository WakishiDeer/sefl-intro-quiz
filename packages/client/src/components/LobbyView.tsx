/**
 * LobbyView — ロビー画面
 *
 * プロフィール入力・参加者一覧・クイズ生成ボタンを表示する。
 * ホストはプロフィール項目の編集、AI リクエストの発動が可能。
 */

import { useState, useEffect } from "react";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { socket } from "../lib/socket.js";
import { clearSession } from "../lib/sessionPersistence.js";
import { C2S_EVENTS, DEFAULT_MIN_PARTICIPANTS } from "@self-intro-quiz/shared";
import { ProfileForm } from "./ProfileForm.js";
import { ParticipantList } from "./ParticipantList.js";
import { RoomCodeDisplay } from "./RoomCodeDisplay.js";
import { ProfileFieldEditor } from "./ProfileFieldEditor.js";
import { AIRequestModal } from "./AIRequestModal.js";
import { AIRequestResultPanel } from "./AIRequestResultPanel.js";
import { ThemePicker } from "./ThemePicker.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { useNavigate } from "react-router";

export function LobbyView() {
  const roomCode = useRoomStore((s) => s.roomCode);
  const isHost = useRoomStore((s) => s.isHost);
  const phase = useRoomStore((s) => s.phase);
  const nickname = useRoomStore((s) => s.nickname);
  const isGenerating = useQuizStore((s) => s.isGenerating);
  const isReady = useQuizStore((s) => s.isReady);
  const generateError = useQuizStore((s) => s.generateError);
  const aiRequestState = useRoomStore((s) => s.aiRequestState);
  const aiRequestOptedOut = useRoomStore((s) => s.aiRequestOptedOut);
  const participants = useRoomStore((s) => s.participants);
  const navigate = useNavigate();
  const theme = useAnimationTheme();

  const profileSubmittedCount = participants.filter((p) => p.hasProfile).length;
  const canGenerate = profileSubmittedCount >= DEFAULT_MIN_PARTICIPANTS && !isGenerating;

  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [showAIRequestModal, setShowAIRequestModal] = useState(false);
  /** ユーザーがモーダルを閉じた時点の aiRequestState を記録。状態が遷移したら再表示する */
  const [dismissedAIState, setDismissedAIState] = useState<string | null>(null);

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

  const handleLeaveRoom = () => {
    if (confirm("ルームから退出しますか？")) {
      socket.emit(C2S_EVENTS.ROOM_LEAVE);
      clearSession();
      useRoomStore.getState().reset();
      useQuizStore.getState().reset();
      navigate("/");
    }
  };

  const handleStartAIRequest = () => {
    socket.emit(C2S_EVENTS.AI_REQUEST_START);
    setShowAIRequestModal(true);
    setDismissedAIState(null);
  };

  const handleDismissAIModal = () => {
    setShowAIRequestModal(false);
    setDismissedAIState(aiRequestState);
  };

  // AI リクエストが idle に戻ったら dismiss 状態をリセット
  // キャンセル後に再開した2回目のリクエストでモーダルが表示されるようにする
  useEffect(() => {
    if (aiRequestState === "idle") {
      setDismissedAIState(null);
      setShowAIRequestModal(false);
    }
  }, [aiRequestState]);

  // AI リクエストモーダルの表示判定:
  // - ホストが明示的に開いた場合
  // - aiRequestState が collecting/generating で、まだ閉じていない or 状態が遷移した
  const shouldShowAIModal =
    aiRequestState !== "idle" &&
    aiRequestState !== "result" &&
    !aiRequestOptedOut &&
    (showAIRequestModal || dismissedAIState !== aiRequestState);

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-8">
      {roomCode && <RoomCodeDisplay roomCode={roomCode} />}

      <div className="grid gap-6 md:grid-cols-2">
        {/* 左: プロフィール入力 */}
        <div className={`rounded-xl ${theme.colors.cardBg} p-5 shadow`}>
          <h2 className={`mb-4 text-lg font-bold ${theme.colors.textPrimary}`}>
            自己紹介を入力
          </h2>
          {phase === "lobby" ? (
            <ProfileForm />
          ) : (
            <div className={`text-center ${theme.colors.textSecondary} py-8`}>
              {isGenerating && (
                <div>
                  <div className={`mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 ${theme.colors.spinner}`} />
                  <p>クイズを生成中...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右: 参加者一覧 + ホスト操作 */}
        <div className={`rounded-xl ${theme.colors.cardBg} p-5 shadow`}>
          <ParticipantList mode="lobby" currentNickname={nickname} />

          {/* Host のみ: 項目編集・AI リクエスト・生成・開始・閉じるボタン */}
          {isHost && (
            <div className="mt-4 space-y-2">
              {phase === "lobby" && (
                <>
                  {/* プロフィール項目編集 */}
                  <button
                    onClick={() => setShowFieldEditor(true)}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition ${theme.colors.buttonGhost}`}
                  >
                    📝 プロフィール項目を編集
                  </button>

                  {/* AI リクエスト */}
                  <button
                    onClick={handleStartAIRequest}
                    className={`w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition ${theme.colors.buttonGhost}`}
                  >
                    🤖 みんなで AI リクエスト
                  </button>

                  {/* クイズ生成 */}
                  <div className="space-y-1">
                    <p className={`text-xs ${
                      profileSubmittedCount >= DEFAULT_MIN_PARTICIPANTS
                        ? "text-green-600"
                        : "text-red-500"
                    }`}>
                      プロフィール提出済み: {profileSubmittedCount}人
                      {profileSubmittedCount < DEFAULT_MIN_PARTICIPANTS && (
                        <span>（最低 {DEFAULT_MIN_PARTICIPANTS}人必要）</span>
                      )}
                    </p>
                    <button
                      onClick={handleGenerate}
                      disabled={!canGenerate}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          クイズを生成中...
                        </>
                      ) : (
                        <>🎯 クイズを生成する</>
                      )}
                    </button>
                  </div>
                </>
              )}

              {isReady && (
                <button
                  onClick={handleStartQuiz}
                  className={`w-full rounded-lg ${theme.colors.buttonPrimary} px-4 py-3 font-semibold text-white transition ${theme.colors.buttonPrimaryHover} animate-pulse`}
                >
                  🚀 クイズを開始する
                </button>
              )}

              {generateError && (
                <div className={`rounded-lg ${theme.colors.badgeError} p-3 text-sm`}>
                  <p>{generateError}</p>
                  <button
                    onClick={handleGenerate}
                    className="mt-1 underline hover:no-underline"
                  >
                    再試行
                  </button>
                </div>
              )

              }

              <button
                onClick={handleCloseRoom}
                className={`w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonDanger}`}
              >
                ルームを閉じる
              </button>
            </div>
          )}

          {/* 全員: 退出ボタン */}
          <div className={isHost ? "mt-2" : "mt-4"}>
            <button
              onClick={handleLeaveRoom}
              className={`w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonGhost}`}
            >
              🚪 ルームから退出する
            </button>
          </div>
        </div>
      </div>

      {/* アニメーションテーマ選択（lobby フェーズのみ） */}
      {phase === "lobby" && (
        <div className={`rounded-xl ${theme.colors.cardBg} p-5 shadow`}>
          <ThemePicker />
        </div>
      )}

      {/* モーダル群 */}
      {showFieldEditor && (
        <ProfileFieldEditor onClose={() => setShowFieldEditor(false)} />
      )}

      {shouldShowAIModal && (
        <AIRequestModal onClose={handleDismissAIModal} />
      )}

      {aiRequestState === "result" && (
        <AIRequestResultPanel
          onClose={() => useRoomStore.getState().resetAIRequest()}
        />
      )}
    </div>
  );
}
