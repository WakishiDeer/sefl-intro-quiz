/**
 * ProfileFieldEditor — プロフィール項目編集パネル
 *
 * ホスト専用。ロビーフェーズでプロフィール入力項目を追加・削除・編集する。
 * 1〜10 個の項目を自由に設定可能。
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

export function ProfileFieldEditor({ onClose }: Props) {
  const currentFields = useRoomStore((s) => s.profileFields);
  const [fields, setFields] = useState<ProfileFieldDefinition[]>(
    () => currentFields.map((f) => ({ ...f })),
  );
  const [error, setError] = useState<string | null>(null);

  const canAdd = fields.length < MAX_PROFILE_FIELDS;
  const canRemove = fields.length > MIN_PROFILE_FIELDS;

  const handleFieldChange = useCallback(
    (index: number, key: keyof ProfileFieldDefinition, value: string) => {
      setFields((prev) => {
        const next = [...prev];
        const field = next[index];
        if (!field) return prev;
        next[index] = { ...field, [key]: value };
        // ラベル変更時に ID も自動更新（新規項目のみ）
        if (key === "label") {
          next[index] = { ...next[index]!, id: generateId(value, index) };
        }
        return next;
      });
    },
    [],
  );

  const handleAdd = useCallback(() => {
    if (!canAdd) return;
    const newId = `field_${Date.now()}`;
    setFields((prev) => [
      ...prev,
      { id: newId, label: "", placeholder: "" },
    ]);
  }, [canAdd]);

  const handleRemove = useCallback(
    (index: number) => {
      if (!canRemove) return;
      setFields((prev) => prev.filter((_, i) => i !== index));
    },
    [canRemove],
  );

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFields((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
      return next;
    });
  }, []);

  const handleMoveDown = useCallback(
    (index: number) => {
      setFields((prev) => {
        if (index >= prev.length - 1) return prev;
        const next = [...prev];
        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
        return next;
      });
    },
    [],
  );

  const handleSave = () => {
    setError(null);

    // バリデーション
    if (fields.length < MIN_PROFILE_FIELDS || fields.length > MAX_PROFILE_FIELDS) {
      setError(`項目数は ${MIN_PROFILE_FIELDS}〜${MAX_PROFILE_FIELDS} の間で設定してください`);
      return;
    }

    const emptyLabel = fields.some((f) => f.label.trim() === "");
    if (emptyLabel) {
      setError("すべての項目にラベルを入力してください");
      return;
    }

    // ラベル重複チェック
    const labels = fields.map((f) => f.label.trim());
    const uniqueLabels = new Set(labels);
    if (uniqueLabels.size !== labels.length) {
      setError("ラベルが重複しています");
      return;
    }

    // ID を正規化
    const normalized = fields.map((f, i) => ({
      id: f.id || generateId(f.label, i),
      label: f.label.trim(),
      placeholder: f.placeholder.trim(),
    }));

    socket.emit(C2S_EVENTS.FIELDS_UPDATE, { fields: normalized });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-gray-800">
          📝 プロフィール項目を編集
        </h2>
        <p className="mb-4 text-sm text-gray-500">
          {MIN_PROFILE_FIELDS}〜{MAX_PROFILE_FIELDS} 個の項目を設定できます（現在 {fields.length} 個）
        </p>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id || index}
              className="flex items-start gap-2 rounded-lg border border-gray-200 p-3"
            >
              {/* 並び替えボタン */}
              <div className="flex flex-col gap-0.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="上に移動"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === fields.length - 1}
                  className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  aria-label="下に移動"
                >
                  ▼
                </button>
              </div>

              {/* 入力フィールド */}
              <div className="flex-1 space-y-1">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => handleFieldChange(index, "label", e.target.value)}
                  placeholder="項目名（例: 出身地）"
                  maxLength={MAX_PROFILE_FIELD_LABEL_LENGTH}
                  className="block w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={field.placeholder}
                  onChange={(e) =>
                    handleFieldChange(index, "placeholder", e.target.value)
                  }
                  placeholder="ヒント（例: 例: 東京都）"
                  maxLength={MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH}
                  className="block w-full rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 focus:border-indigo-400 focus:outline-none"
                />
              </div>

              {/* 削除ボタン */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                disabled={!canRemove}
                className="mt-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                aria-label="この項目を削除"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* 追加ボタン */}
        {canAdd && (
          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 w-full rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 transition hover:border-indigo-400 hover:text-indigo-600"
          >
            ＋ 項目を追加
          </button>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {/* 操作ボタン */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ラベルから安全な ID を生成する。
 * 日本語ラベルの場合は index ベースのフォールバック。
 */
function generateId(label: string, index: number): string {
  const ascii = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return ascii || `field_${index}`;
}
