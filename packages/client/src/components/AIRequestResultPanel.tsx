/**
 * AIRequestResultPanel — AI 提案結果パネル
 *
 * ホスト専用。AI が提案したプロフィール項目を表示し、
 * 個別にトグル・編集してから採用する。
 */

import { useState, useCallback } from "react";
import { socket } from "../lib/socket.js";
import {
  C2S_EVENTS,
  MIN_PROFILE_FIELDS,
  MAX_PROFILE_FIELDS,
  MAX_PROFILE_FIELD_LABEL_LENGTH,
  MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH,
} from "@self-intro-quiz/shared";
import type { ProfileFieldDefinition } from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";

interface Props {
  onClose: () => void;
}

interface FieldWithToggle extends ProfileFieldDefinition {
  enabled: boolean;
}

export function AIRequestResultPanel({ onClose }: Props) {
  const suggestedFields = useRoomStore((s) => s.aiRequestSuggestedFields);
  const resetAIRequest = useRoomStore((s) => s.resetAIRequest);

  const [fields, setFields] = useState<FieldWithToggle[]>(() =>
    (suggestedFields ?? []).map((f) => ({ ...f, enabled: true })),
  );
  const [error, setError] = useState<string | null>(null);

  const enabledCount = fields.filter((f) => f.enabled).length;

  const toggleField = useCallback((index: number) => {
    setFields((prev) => {
      const next = [...prev];
      const field = next[index];
      if (!field) return prev;
      next[index] = { ...field, enabled: !field.enabled };
      return next;
    });
  }, []);

  const updateField = useCallback(
    (index: number, key: "label" | "placeholder", value: string) => {
      setFields((prev) => {
        const next = [...prev];
        const field = next[index];
        if (!field) return prev;
        next[index] = { ...field, [key]: value };
        return next;
      });
    },
    [],
  );

  const handleAdopt = () => {
    setError(null);
    const selected = fields.filter((f) => f.enabled);

    if (selected.length < MIN_PROFILE_FIELDS) {
      setError(`最低 ${MIN_PROFILE_FIELDS} 個の項目を選択してください`);
      return;
    }
    if (selected.length > MAX_PROFILE_FIELDS) {
      setError(`最大 ${MAX_PROFILE_FIELDS} 個まで選択できます`);
      return;
    }

    const emptyLabel = selected.some((f) => f.label.trim() === "");
    if (emptyLabel) {
      setError("すべての項目にラベルを入力してください");
      return;
    }

    const adopted: ProfileFieldDefinition[] = selected.map((f) => ({
      id: f.id,
      label: f.label.trim(),
      placeholder: f.placeholder.trim(),
    }));

    socket.emit(C2S_EVENTS.AI_REQUEST_ADOPT, { fields: adopted });
    resetAIRequest();
    onClose();
  };

  const handleDiscard = () => {
    socket.emit(C2S_EVENTS.AI_REQUEST_DISCARD);
    resetAIRequest();
    onClose();
  };

  if (!suggestedFields || suggestedFields.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
          <p className="text-gray-600">AI からの提案がありません</p>
          <button
            type="button"
            onClick={handleDiscard}
            className="mt-4 rounded-lg border border-gray-300 px-6 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-bold text-gray-800">
          🤖 AI が提案したプロフィール項目
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          使いたい項目を選んで、必要に応じて編集してください（{enabledCount} 個選択中）
        </p>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                field.enabled
                  ? "border-indigo-200 bg-indigo-50/50"
                  : "border-gray-200 bg-gray-50 opacity-60"
              }`}
            >
              {/* チェックボックス */}
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={() => toggleField(index)}
                aria-label={`${field.label} を有効にする`}
                title={`${field.label} を有効にする`}
                className="mt-1.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />

              {/* 編集可能なフィールド */}
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateField(index, "label", e.target.value)}
                  disabled={!field.enabled}
                  maxLength={MAX_PROFILE_FIELD_LABEL_LENGTH}
                  aria-label="項目ラベル"
                  title="項目ラベル"
                  className="block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none disabled:bg-gray-100"
                />
                <input
                  type="text"
                  value={field.placeholder}
                  onChange={(e) =>
                    updateField(index, "placeholder", e.target.value)
                  }
                  disabled={!field.enabled}
                  maxLength={MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH}
                  aria-label="プレースホルダーテキスト"
                  title="プレースホルダーテキスト"
                  className="block w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 focus:border-indigo-400 focus:outline-none disabled:bg-gray-100"
                />
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            破棄する
          </button>
          <button
            type="button"
            onClick={handleAdopt}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            採用する（{enabledCount} 個）
          </button>
        </div>
      </div>
    </div>
  );
}
