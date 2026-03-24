/**
 * Profile — 自己紹介プロフィール（Value Object）
 *
 * Room Context に属する Value Object。参加者が入力する自己紹介情報。
 * 各フィールドは最大100文字。サーバ側で sanitize-html によるサニタイズを実施する。
 *
 * フィールド構成はホストがカスタマイズ可能（1〜10項目）。
 * キーは ProfileFieldDefinition.id に対応する動的キー。
 */

// ============================================================
// ProfileFieldDefinition — プロフィール項目定義
// ============================================================

/**
 * プロフィール入力フォームの1項目を定義する。
 * ホストが自由に追加・削除・編集できる。
 */
export interface ProfileFieldDefinition {
    /** 項目の一意識別子（英数スネークケース, 例: "hometown", "custom_1"） */
    id: string;
    /** 表示ラベル（例: "出身地"） */
    label: string;
    /** プレースホルダー（例: "例: 東京都"） */
    placeholder: string;
}

// ============================================================
// Profile — 動的フィールドの値マップ
// ============================================================

/**
 * 参加者が入力したプロフィール値。
 * キーは ProfileFieldDefinition.id に対応し、値は最大100文字の文字列。
 *
 * 例: { hometown: "東京都", hobbies: "映画鑑賞", custom_1: "猫派" }
 */
export type Profile = Record<string, string>;

// ============================================================
// ProfileFieldPreset — プロフィール項目プリセット
// ============================================================

/**
 * プリセットの一意識別子。
 * 新しいプリセットを追加する場合はこのユニオン型に追加する。
 */
export type ProfileFieldPresetId =
    | "default"
    | "drinking_party"
    | "first_meeting"
    | "deep_dive"
    | "future_goals"
    | "past_stories"
    | "company_work"
    | "best_buys"
    | "food_gourmet"
    | "travel"
    | "entertainment"
    | "if_questions"
    | "hobby_otaku"
    | "health_lifestyle"
    | "pet_animal"
    | "childhood"
    | "skills_talents"
    | "seasonal_yearend"
    | "random_fun"
    | "values_philosophy";

/**
 * プロフィール項目のプリセット定義。
 * ホストがロビーでワンタップで項目セットを切り替えられる。
 *
 * 静的カタログとして shared パッケージに定義し、
 * 将来的には DB や API から動的に取得する拡張パスを想定。
 */
export interface ProfileFieldPreset {
    /** プリセットの一意識別子 */
    readonly id: ProfileFieldPresetId;
    /** 表示ラベル（例: "飲み会・懇親会"） */
    readonly label: string;
    /** 絵文字アイコン（例: "🍻"） */
    readonly icon: string;
    /** プリセットの説明（例: "お酒の場で盛り上がる話題"） */
    readonly description: string;
    /** このプリセットが含むプロフィール項目定義 */
    readonly fields: readonly ProfileFieldDefinition[];
}
