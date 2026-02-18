/**
 * AIRequestModal — みんなで AI リクエスト モーダル
 *
 * ホストが AI リクエストを発動すると全参加者に表示される。
 * 参加者はプリセット選択 + 自由テキストでリクエストを送信する。
 * ホストには「リクエスト締切 → AI 生成」ボタンも表示される。
 */

import { useState, useCallback } from "react";
import { socket } from "../lib/socket.js";
import {
  C2S_EVENTS,
  AI_REQUEST_PRESETS,
  AI_REQUEST_MAX_FREE_TEXT,
} from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { Timer } from "./Timer.js";

interface Props {
  onClose: () => void;
}

export function AIRequestModal({ onClose }: Props) {
  const isHost = useRoomStore((s) => s.isHost);
  const aiState = useRoomStore((s) => s.aiRequestState);
  const expiresAt = useRoomStore((s) => s.aiRequestExpiresAt);
  const submittedCount = useRoomStore((s) => s.aiRequestSubmittedCount);
  const totalParticipants = useRoomStore((s) => s.aiRequestTotalParticipants);

  const [selectedPresets, setSelectedPresets] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <h2 className="text-lg font-bold text-gray-800">
            AI がプロフィール項目を考え中...
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            みんなのリクエストをもとに最適な項目を提案します
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            閉じる（結果が届いたら再表示されます）
          </button>
        </div>
      </div>
    );
  }

  // 収集中
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">
            🤖 みんなで AI リクエスト
          </h2>
          {expiresAt && (
            <div className="text-sm text-gray-500">
              残り <Timer timerEndsAt={expiresAt} />
            </div>
          )}
        </div>

        <p className="mb-4 text-sm text-gray-600">
          どんなプロフィール項目がいいか、リクエストを送ろう！
        </p>

        {/* 収集状況 */}
        <div className="mb-4 rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
          📊 {submittedCount} / {totalParticipants} 人がリクエスト済み
        </div>

        {submitted ? (
          /* 送信済み */
          <div className="rounded-xl bg-green-50 p-6 text-center">
            <p className="text-lg font-medium text-green-700">
              ✅ リクエストを送信しました！
            </p>
            <p className="mt-1 text-sm text-green-600">
              他のメンバーのリクエストを待っています...
            </p>
          </div>
        ) : (
          /* 入力フォーム */
          <div className="space-y-4">
            {/* プリセット選択 */}
            <div>
              <p className="mb-2 text-sm font-medium text-gray-700">
                プリセットから選択（複数可）
              </p>
              <div className="flex flex-wrap gap-2">
                {AI_REQUEST_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      selectedPresets.includes(preset)
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 自由テキスト */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                自由にリクエスト
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="例: ペットについての項目がほしい！"
                maxLength={AI_REQUEST_MAX_FREE_TEXT}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
              />
              <p className="mt-1 text-right text-xs text-gray-400">
                {freeText.length} / {AI_REQUEST_MAX_FREE_TEXT}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedPresets.length === 0 && freeText.trim() === ""}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              リクエストを送信
            </button>
          </div>
        )}

        {/* ホスト用コントロール */}
        {isHost && (
          <div className="mt-5 border-t border-gray-200 pt-4">
            <p className="mb-2 text-xs text-gray-500">
              ホスト操作: リクエスト受付を締め切って AI に項目を提案してもらいます
            </p>
            <button
              type="button"
              onClick={handleFinalize}
              className="w-full rounded-lg bg-amber-500 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
            >
              🚀 受付を締め切って AI 生成開始
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="mt-2 w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 transition hover:bg-red-50"
            >
              ❌ AI リクエストをキャンセル
            </button>
          </div>
        )}

        {/* 閉じるボタン（全員表示・セッションは継続） */}
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
