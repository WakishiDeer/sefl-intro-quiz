/**
 * AIRequestModal — みんなで AI リクエスト モーダル
 *
 * ホストが AI リクエストを発動すると全参加者に表示される。
 * 参加者はプリセット選択 + 自由テキストでリクエストを送信する。
 * ホストには「リクエスト締切 → AI 生成」ボタンも表示される。
 */

import { useState, useCallback, useMemo } from "react";
import { socket } from "../lib/socket.js";
import {
  C2S_EVENTS,
  AI_REQUEST_PRESETS,
  AI_REQUEST_DISPLAY_COUNT,
  AI_REQUEST_MAX_FREE_TEXT,
} from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { Timer } from "./Timer.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

/**
 * Fisher-Yates シャッフルで配列からランダムに count 個を選ぶ。
 * 元の配列は変更しない。
 */
function pickRandom<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const n = Math.min(count, pool.length);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j] as T;
    pool[j] = tmp as T;
  }
  return pool.slice(0, n);
}

interface Props {
  onClose: () => void;
}

export function AIRequestModal({ onClose }: Props) {
  const isHost = useRoomStore((s) => s.isHost);
  const aiState = useRoomStore((s) => s.aiRequestState);
  const expiresAt = useRoomStore((s) => s.aiRequestExpiresAt);
  const submittedCount = useRoomStore((s) => s.aiRequestSubmittedCount);
  const totalParticipants = useRoomStore((s) => s.aiRequestTotalParticipants);
  const theme = useAnimationTheme();

  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  /** プリセットプールからランダムに DISPLAY_COUNT 個を表示 */
  const displayedPresets = useMemo(
    () => pickRandom(AI_REQUEST_PRESETS, AI_REQUEST_DISPLAY_COUNT) as string[],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shuffleKey の変更で再抽選
    [shuffleKey],
  );

  const handleShuffle = useCallback(() => {
    setShuffleKey((k) => k + 1);
    // シャッフル後も選択済みプリセットが新しい表示に含まれていれば維持される
    // 含まれなくなったプリセットの選択は有効なまま送信される（非表示でも問題ない）
  }, []);

  const togglePreset = useCallback((preset: string) => {
    setSelectedPresets((prev) =>
      prev.includes(preset)
        ? prev.filter((p) => p !== preset)
        : [...prev, preset],
    );
  }, []);

  const handleSubmit = () => {
    if (selectedPresets.length === 0 && freeText.trim() === "") return;
    socket.emit(C2S_EVENTS.AI_REQUEST_SUBMIT, {
      presets: selectedPresets,
      freeText: freeText.trim(),
    });
    setSubmitted(true);
  };

  const handleFinalize = () => {
    socket.emit(C2S_EVENTS.AI_REQUEST_FINALIZE, {});
  };

  const handleCancel = () => {
    socket.emit(C2S_EVENTS.AI_REQUEST_CANCEL);
    onClose();
  };

  // AI 生成中
  if (aiState === "generating") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className={`mx-4 w-full max-w-md rounded-2xl ${theme.colors.modalBg} p-8 text-center shadow-xl`}>
          <div className={`mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 ${theme.colors.spinner}`} />
          <h2 className={`text-lg font-bold ${theme.colors.textPrimary}`}>
            AI がプロフィール項目を考え中...
          </h2>
          <p className={`mt-2 text-sm ${theme.colors.textSecondary}`}>
            みんなのリクエストをもとに最適な項目を提案します
          </p>
          {isHost ? (
            <button
              type="button"
              onClick={handleCancel}
              className={`mt-5 w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonDanger}`}
            >
              ❌ AI リクエストをキャンセル
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`mt-5 w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonGhost}`}
            >
              閉じる（結果が届いたら再表示されます）
            </button>
          )}
        </div>
      </div>
    );
  }

  // 収集中
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className={`mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl ${theme.colors.modalBg} p-6 shadow-xl`}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-lg font-bold ${theme.colors.textPrimary}`}>
            🤖 みんなで AI リクエスト
          </h2>
          {expiresAt && (
            <div className={`text-sm ${theme.colors.textSecondary}`}>
              残り <Timer timerEndsAt={expiresAt} />
            </div>
          )}
        </div>

        <p className={`mb-4 text-sm ${theme.colors.textSecondary}`}>
          どんなプロフィール項目がいいか、リクエストを送ろう！
        </p>

        {/* 収集状況 */}
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${theme.colors.progressIndicator}`}>
          📊 {submittedCount} / {totalParticipants} 人がリクエスト済み
        </div>

        {submitted ? (
          /* 送信済み */
          <div className={`rounded-xl ${theme.colors.badgeSuccess} p-6 text-center`}>
            <p className="text-lg font-medium">
              ✅ リクエストを送信しました！
            </p>
            <p className="mt-1 text-sm">
              他のメンバーのリクエストを待っています...
            </p>
          </div>
        ) : (
          /* 入力フォーム */
          <div className="space-y-4">
            {/* プリセット選択 */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className={`text-sm font-medium ${theme.colors.labelText}`}>
                  プリセットから選択（複数可）
                </p>
                <button
                  type="button"
                  onClick={handleShuffle}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${theme.colors.linkText} hover:opacity-80`}
                  title="別の候補を表示"
                >
                  🔀 別の候補
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {displayedPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      selectedPresets.includes(preset)
                        ? theme.colors.chipSelected
                        : theme.colors.chipDefault
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {/* 非表示だが選択済みのプリセットがあれば表示 */}
              {selectedPresets.filter((p) => !displayedPresets.includes(p)).length > 0 && (
                <p className={`mt-1.5 text-xs ${theme.colors.textAccent}`}>
                  + 前の候補から {selectedPresets.filter((p) => !displayedPresets.includes(p)).length} 件選択済み
                </p>
              )}
            </div>

            {/* 自由テキスト */}
            <div>
              <label className={`mb-1 block text-sm font-medium ${theme.colors.labelText}`}>
                自由にリクエスト
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例: ペットについての項目がほしい！"
                maxLength={AI_REQUEST_MAX_FREE_TEXT}
                rows={3}
                className={`block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.colors.inputField} ${theme.colors.inputFocus}`}
              />
              <p className={`mt-1 text-right text-xs ${theme.colors.textSecondary}`}>
                {freeText.length} / {AI_REQUEST_MAX_FREE_TEXT}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedPresets.length === 0 && freeText.trim() === ""}
              className={`w-full rounded-lg ${theme.colors.buttonPrimary} px-4 py-2.5 font-semibold text-white transition ${theme.colors.buttonPrimaryHover} disabled:opacity-50`}
            >
              リクエストを送信
            </button>
          </div>
        )}

        {/* ホスト用コントロール */}
        {isHost && (
          <div className={`mt-5 border-t ${theme.colors.cardBorder} pt-4`}>
            <p className={`mb-2 text-xs ${theme.colors.textSecondary}`}>
              ホスト操作: リクエスト受付を締め切って AI に項目を提案してもらいます
            </p>
            <button
              type="button"
              onClick={handleFinalize}
              className={`w-full rounded-lg ${theme.colors.buttonAccent} px-4 py-2.5 font-semibold text-white transition ${theme.colors.buttonAccentHover}`}
            >
              🚀 受付を締め切って AI 生成開始
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className={`mt-2 w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonDanger}`}
            >
              ❌ AI リクエストをキャンセル
            </button>
          </div>
        )}

        {/* 閉じるボタン（非ホストのみ・セッションは継続） */}
        {!isHost && (
          <button
            type="button"
            onClick={() => {
              // 未送信の場合はサーバに dismiss（オプトアウト）を通知
              if (!submitted) {
                socket.emit(C2S_EVENTS.AI_REQUEST_DISMISS);
                useRoomStore.getState().setAIRequestOptedOut(true);
              }
              onClose();
            }}
            className={`mt-3 w-full rounded-lg border px-4 py-2 text-sm transition ${theme.colors.buttonGhost}`}
          >
            閉じる
          </button>
        )}
      </div>
    </div>
  );
}
