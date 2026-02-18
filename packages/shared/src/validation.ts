/**
 * validation.ts — Zod バリデーションスキーマ
 *
 * サーバ・クライアント両方で使用する入力バリデーション。
 * Socket.IO イベントのペイロードを検証してからドメインに渡す。
 */

import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
    MIN_NICKNAME_LENGTH,
    MAX_NICKNAME_LENGTH,
    MAX_PROFILE_FIELD_LENGTH,
    MIN_PROFILE_FILLED_FIELDS,
    ROOM_CODE_LENGTH,
    MAX_CHOICES,
} from "./constants.js";

// ============================================================
// Nickname
// ============================================================

export const NicknameSchema = z
    .string()
    .min(MIN_NICKNAME_LENGTH, `ニックネームは${MIN_NICKNAME_LENGTH}文字以上`)
    .max(MAX_NICKNAME_LENGTH, `ニックネームは${MAX_NICKNAME_LENGTH}文字以下`)
    .regex(/^[^\s<>&"']+$/, "使用できない文字が含まれています");

// ============================================================
// Room Code
// ============================================================

export const RoomCodeSchema = z
    .string()
    .length(ROOM_CODE_LENGTH)
    .regex(/^[A-Z0-9]+$/);

// ============================================================
// Profile
// ============================================================

export const ProfileFieldSchema = z.string().max(MAX_PROFILE_FIELD_LENGTH).default("");

/**
 * プロフィールスキーマ。
 * 最低1つのフィールドに非空の値が必要（全フィールド空白のみは拒否）。
 */
export const ProfileSchema = z.object({
    hometown: ProfileFieldSchema,
    hobbies: ProfileFieldSchema,
    skills: ProfileFieldSchema,
    favoriteFood: ProfileFieldSchema,
    surprisingFact: ProfileFieldSchema,
    freeText: ProfileFieldSchema,
}).refine(
    (data) => {
        const values = Object.values(data);
        const filledCount = values.filter((v) => v.trim().length > 0).length;
        return filledCount >= MIN_PROFILE_FILLED_FIELDS;
    },
    {
        message: `少なくとも${MIN_PROFILE_FILLED_FIELDS}つのフィールドを入力してください`,
    },
);

// ============================================================
// Client → Server イベントペイロード
// ============================================================

/** room:create ペイロード */
export const CreateRoomSchema = z.object({
    nickname: NicknameSchema,
});

/** room:join ペイロード */
export const JoinRoomSchema = z.object({
    roomCode: RoomCodeSchema,
    nickname: NicknameSchema,
});

/** profile:submit ペイロード */
export const SubmitProfileSchema = z.object({
    profile: ProfileSchema,
});

/** room:check-nickname ペイロード */
export const CheckNicknameSchema = z.object({
    roomCode: RoomCodeSchema,
    nickname: NicknameSchema,
});

/** question:answer ペイロード */
export const SubmitAnswerSchema = z.object({
    questionIndex: z.number().int().min(0).max(9),
    choiceIndex: z.number().int().min(0).max(MAX_CHOICES - 1),
});

// ============================================================
// AI 出力バリデーション
// ============================================================

/** AI が返す1問分のスキーマ */
export const AIQuestionSchema = z.object({
    questionText: z.string().min(1).max(500),
    choices: z.array(z.string().min(1)).min(2).max(MAX_CHOICES),
    correctIndex: z.number().int().min(0).max(MAX_CHOICES - 1),
    explanation: z.string().min(1).max(500),
    subjectNickname: z.string().min(1),
});

/** AI が返す全問のスキーマ */
export const AIOutputSchema = z.object({
    questions: z.array(AIQuestionSchema).length(10),
});

// ============================================================
// AI 出力 JSON Schema（Claude tool_use 用）
// Zod スキーマから自動生成し、単一の定義源（Single Source of Truth）を維持する。
// スキーマ変更時は上の Zod 定義のみを修正すれば JSON Schema も自動追従する。
// ============================================================

/**
 * Claude API の tool_use で使用する input_schema。
 * AIOutputSchema (Zod) から自動生成された JSON Schema オブジェクト。
 *
 * 注意: `name` オプションを指定すると definitions ラッパーで包まれ、
 * トップレベルに `type: "object"` が存在しなくなる。
 * Anthropic API は `input_schema.type` を必須とするため、
 * `name` を指定せずフラットな JSON Schema を生成する。
 */
const rawJsonSchema = zodToJsonSchema(AIOutputSchema, {
    $refStrategy: "none",
}) as Record<string, unknown>;

// Anthropic API は JSON Schema のメタキーを受け付けないため除去
delete rawJsonSchema.$schema;

export const AIOutputJsonSchema = rawJsonSchema;

// ============================================================
// 型エクスポート
// ============================================================

export type NicknameInput = z.infer<typeof NicknameSchema>;
export type RoomCodeInput = z.infer<typeof RoomCodeSchema>;
export type ProfileInput = z.infer<typeof ProfileSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type JoinRoomInput = z.infer<typeof JoinRoomSchema>;
export type SubmitProfileInput = z.infer<typeof SubmitProfileSchema>;
export type CheckNicknameInput = z.infer<typeof CheckNicknameSchema>;
export type SubmitAnswerInput = z.infer<typeof SubmitAnswerSchema>;
export type AIQuestionOutput = z.infer<typeof AIQuestionSchema>;
export type AIOutput = z.infer<typeof AIOutputSchema>;
