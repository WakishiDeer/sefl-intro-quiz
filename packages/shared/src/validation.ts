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
    MIN_PROFILE_FIELDS,
    MAX_PROFILE_FIELDS,
    MAX_PROFILE_FIELD_LABEL_LENGTH,
    MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH,
    AI_REQUEST_MAX_FREE_TEXT,
    MAX_QUESTIONS,
    MIN_QUESTIONS,
    ANIMATION_THEMES,
} from "./constants.js";
import type { ProfileFieldDefinition } from "./types/profile.js";

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
 * プロフィール項目定義のバリデーション。
 * ホストが項目を編集する際に使用する。
 */
export const ProfileFieldDefinitionSchema = z.object({
    id: z
        .string()
        .min(1, "項目IDは必須です")
        .max(50, "項目IDは50文字以下")
        .regex(/^[a-z][a-z0-9_]*$/, "項目IDは英小文字・数字・アンダースコアのみ（先頭は英小文字）"),
    label: z
        .string()
        .min(1, "ラベルは必須です")
        .max(MAX_PROFILE_FIELD_LABEL_LENGTH, `ラベルは${MAX_PROFILE_FIELD_LABEL_LENGTH}文字以下`),
    placeholder: z
        .string()
        .max(MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH, `プレースホルダーは${MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH}文字以下`)
        .default(""),
});

/**
 * プロフィール項目定義の配列バリデーション。
 * fields:update イベントのペイロードに使用。
 */
export const UpdateFieldsSchema = z.object({
    fields: z
        .array(ProfileFieldDefinitionSchema)
        .min(MIN_PROFILE_FIELDS, `項目は${MIN_PROFILE_FIELDS}個以上必要です`)
        .max(MAX_PROFILE_FIELDS, `項目は${MAX_PROFILE_FIELDS}個以下です`)
        .refine(
            (fields) => {
                const ids = fields.map((f) => f.id);
                return new Set(ids).size === ids.length;
            },
            { message: "項目IDが重複しています" },
        ),
});

/**
 * 固定フィールドの旧 ProfileSchema（後方互換用）。
 * 新しいコードでは createProfileSchema() を使用すること。
 * @deprecated createProfileSchema を使用してください
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

/**
 * 動的プロフィールフィールドに基づくバリデーションスキーマを生成する。
 * ホストがカスタマイズした項目定義に応じて、対応するキーの Record<string, string> をバリデーション。
 *
 * @param fields - 現在のルームのプロフィール項目定義
 * @returns 動的 Zod スキーマ
 */
export function createProfileSchema(fields: ProfileFieldDefinition[]) {
    const shape: Record<string, z.ZodDefault<z.ZodString>> = {};
    for (const field of fields) {
        shape[field.id] = ProfileFieldSchema;
    }
    return z.object(shape).refine(
        (data) => {
            const values = Object.values(data);
            const filledCount = values.filter((v) => typeof v === "string" && v.trim().length > 0).length;
            return filledCount >= MIN_PROFILE_FILLED_FIELDS;
        },
        {
            message: `少なくとも${MIN_PROFILE_FILLED_FIELDS}つのフィールドを入力してください`,
        },
    );
}

// ============================================================
// Client → Server イベントペイロード
// ============================================================

/** room:create ペイロード */
export const CreateRoomSchema = z.object({
    nickname: NicknameSchema,
    /** ブラウザ単位の一意識別子（マルチタブ重複防止用） */
    clientId: z.string().uuid().optional(),
});

/** room:join ペイロード */
export const JoinRoomSchema = z.object({
    roomCode: RoomCodeSchema,
    nickname: NicknameSchema,
    /** ブラウザ単位の一意識別子（マルチタブ重複防止用） */
    clientId: z.string().uuid().optional(),
});

/** profile:submit ペイロード（動的フィールド対応） */
export const SubmitProfileSchema = z.object({
    profile: z.record(z.string(), ProfileFieldSchema),
});

/** room:check-nickname ペイロード */
export const CheckNicknameSchema = z.object({
    roomCode: RoomCodeSchema,
    nickname: NicknameSchema,
});

/** question:answer ペイロード */
export const SubmitAnswerSchema = z.object({
    questionIndex: z.number().int().min(0).max(MAX_QUESTIONS - 1),
    choiceIndex: z.number().int().min(0).max(MAX_CHOICES - 1),
});

/** quiz:vote-curious ペイロード */
export const VoteCuriousSchema = z.object({
    questionIndex: z.number().int().min(0).max(MAX_QUESTIONS - 1),
});

// ============================================================
// アニメーションテーマ
// ============================================================

/** room:set-theme ペイロード（ホストがテーマを変更） */
export const SetThemeSchema = z.object({
    theme: z.enum(ANIMATION_THEMES as unknown as [string, ...string[]]),
});

// ============================================================
// AI リクエスト バリデーション
// ============================================================

/** ai-request:submit ペイロード */
export const AIRequestSubmitSchema = z.object({
    presets: z.array(z.string().max(100)).max(10).default([]),
    freeText: z.string().max(AI_REQUEST_MAX_FREE_TEXT).default(""),
}).refine(
    (data) => data.presets.length > 0 || data.freeText.trim().length > 0,
    { message: "プリセットか自由テキストのどちらかを入力してください" },
);

/** ai-request:adopt ペイロード（ホストが AI 提案を採用する際） */
export const AIRequestAdoptSchema = z.object({
    fields: z
        .array(ProfileFieldDefinitionSchema)
        .min(MIN_PROFILE_FIELDS, `項目は${MIN_PROFILE_FIELDS}個以上必要です`)
        .max(MAX_PROFILE_FIELDS, `項目は${MAX_PROFILE_FIELDS}個以下です`),
});

// ============================================================
// AI 出力バリデーション
// ============================================================

/** AI が返す1問分のスキーマ */
export const AIQuestionSchema = z.object({
    questionType: z.enum(["four-choice", "yes-no"]),
    questionText: z.string().min(1).max(500),
    choices: z.array(z.string().min(1)).min(2).max(MAX_CHOICES),
    correctIndex: z.number().int().min(0).max(MAX_CHOICES - 1),
    explanation: z.string().min(1).max(500),
    subjectNickname: z.string().min(1),
});

/** AI が返す全問のスキーマ（デフォルト: MIN_QUESTIONS〜MAX_QUESTIONS問の範囲を許容） */
export const AIOutputSchema = z.object({
    questions: z.array(AIQuestionSchema).min(MIN_QUESTIONS).max(MAX_QUESTIONS),
});

/**
 * 指定された問題数で AI 出力をバリデーションする Zod スキーマを生成する。
 * 動的な問題数に対応するため、QuizGenerator 実装で使用する。
 *
 * @param totalQuestions - 期待される総問題数
 */
export function createAIOutputSchema(totalQuestions: number) {
    return z.object({
        questions: z.array(AIQuestionSchema).length(totalQuestions),
    });
}

// ============================================================
// AI 出力 JSON Schema（tool_use / function calling 用）
// Zod スキーマから自動生成し、単一の定義源（Single Source of Truth）を維持する。
// スキーマ変更時は上の Zod 定義のみを修正すれば JSON Schema も自動追従する。
// ============================================================

/**
 * AI API の function calling で使用する JSON Schema。
 * AIOutputSchema (Zod) から自動生成された JSON Schema オブジェクト。
 *
 * 注意: `name` オプションを指定すると definitions ラッパーで包まれ、
 * トップレベルに `type: "object"` が存在しなくなる。
 * API は `type` を必須とするため、
 * `name` を指定せずフラットな JSON Schema を生成する。
 */
const rawJsonSchema = zodToJsonSchema(AIOutputSchema, {
    $refStrategy: "none",
}) as Record<string, unknown>;

// API は JSON Schema のメタキーを受け付けないため除去
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
