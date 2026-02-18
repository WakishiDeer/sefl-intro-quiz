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
