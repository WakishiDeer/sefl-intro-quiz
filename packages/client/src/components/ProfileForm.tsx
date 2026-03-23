/**
 * ProfileForm — プロフィール入力フォーム
 *
 * ロビーフェーズで参加者が自己紹介情報を入力する。
 * プロフィール項目はホストのカスタマイズに応じて動的に表示される。
 */

import { useState, useEffect, useCallback } from "react";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, S2C_EVENTS, createProfileSchema, MAX_PROFILE_FIELD_LENGTH } from "@self-intro-quiz/shared";
import type { RoomErrorPayload, ProfileFieldDefinition } from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

export function ProfileForm() {
  const profileFields = useRoomStore((s) => s.profileFields);
  const profileInvalidated = useRoomStore((s) => s.profileInvalidated);
  const myProfile = useRoomStore((s) => s.myProfile);
  const theme = useAnimationTheme();

  const [form, setForm] = useState<Record<string, string>>(() =>
    buildInitialForm(profileFields, myProfile),
  );
  const [submitted, setSubmitted] = useState(() => myProfile !== null);
  const [error, setError] = useState<string | null>(null);

  // プロフィール項目が変更された時にフォームをリセット
  useEffect(() => {
    if (profileInvalidated) {
      setForm(buildEmptyForm(profileFields));
      setSubmitted(false);
      setError(null);
      useRoomStore.getState().clearProfileInvalidated();
    }
  }, [profileFields, profileInvalidated]);

  // サーバ側バリデーションエラーのリスナー（profile:submit 拒否時のフィードバック）
  useEffect(() => {
    const onError = (payload: RoomErrorPayload) => {
      if (payload.code === "VALIDATION_ERROR" || payload.code === "INVALID_PHASE") {
        setError(payload.message);
        setSubmitted(false);
      }
    };
    socket.on(S2C_EVENTS.ROOM_ERROR, onError);
    return () => {
      socket.off(S2C_EVENTS.ROOM_ERROR, onError);
    };
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const schema = createProfileSchema(profileFields);
    const result = schema.safeParse(form);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? "入力が不正です");
      return;
    }

    socket.emit(C2S_EVENTS.PROFILE_SUBMIT, { profile: form });
    setSubmitted(true);
    useRoomStore.getState().setMyProfile(form);
  };

  if (submitted) {
    return (
      <div className={`rounded-xl ${theme.colors.badgeSuccess} p-6 text-center`}>
        <p className="text-lg font-medium">✅ プロフィールを送信しました！</p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-2 text-sm underline hover:no-underline"
        >
          編集する
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {profileFields.map((field) => (
        <div key={field.id}>
          <label className={`block text-sm font-medium ${theme.colors.labelText}`}>
            {field.label}
          </label>
          <input
            type="text"
            value={form[field.id] ?? ""}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            maxLength={MAX_PROFILE_FIELD_LENGTH}
            className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none ${theme.colors.inputField} ${theme.colors.inputFocus}`}
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button
        type="submit"
        className={`w-full rounded-lg px-4 py-2 font-semibold text-white transition ${theme.colors.buttonPrimary} ${theme.colors.buttonPrimaryHover}`}
      >
        プロフィールを送信
      </button>
    </form>
  );
}

/** プロフィール項目定義から空のフォーム値を生成する */
function buildEmptyForm(fields: ProfileFieldDefinition[]): Record<string, string> {
  const form: Record<string, string> = {};
  for (const field of fields) {
    form[field.id] = "";
  }
  return form;
}

/** 既存プロフィールがあれば値を復元し、なければ空のフォーム値を生成する */
function buildInitialForm(
  fields: ProfileFieldDefinition[],
  existingProfile: Record<string, string> | null,
): Record<string, string> {
  const form: Record<string, string> = {};
  for (const field of fields) {
    form[field.id] = existingProfile?.[field.id] ?? "";
  }
  return form;
}
