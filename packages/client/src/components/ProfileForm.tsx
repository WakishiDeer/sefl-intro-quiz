/**
 * ProfileForm — プロフィール入力フォーム
 *
 * ロビーフェーズで参加者が自己紹介情報を入力する。
 */

import { useState } from "react";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, ProfileSchema, MAX_PROFILE_FIELD_LENGTH } from "@self-intro-quiz/shared";

const FIELDS = [
  { key: "hometown", label: "出身地", placeholder: "例: 東京都" },
  { key: "hobbies", label: "趣味", placeholder: "例: 映画鑑賞、ジョギング" },
  { key: "skills", label: "特技", placeholder: "例: 料理、プログラミング" },
  { key: "favoriteFood", label: "好きな食べ物", placeholder: "例: カレーライス" },
  { key: "surprisingFact", label: "意外な事実", placeholder: "例: 実は3カ国語話せます" },
  { key: "freeText", label: "自由記述", placeholder: "何でもどうぞ！" },
] as const;

type ProfileField = (typeof FIELDS)[number]["key"];

export function ProfileForm() {
  const [form, setForm] = useState<Record<ProfileField, string>>({
    hometown: "",
    hobbies: "",
    skills: "",
    favoriteFood: "",
    surprisingFact: "",
    freeText: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: ProfileField, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = ProfileSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "入力が不正です");
      return;
    }

    socket.emit(C2S_EVENTS.PROFILE_SUBMIT, { profile: form });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-center">
        <p className="text-lg font-medium text-green-700">✅ プロフィールを送信しました！</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-sm text-green-600 underline hover:no-underline"
        >
          編集する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {FIELDS.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700">
            {field.label}
          </label>
          <input
            type="text"
            value={form[field.key]}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            maxLength={MAX_PROFILE_FIELD_LENGTH}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700"
      >
        プロフィールを送信
      </button>
    </form>
  );
}
