/**
 * constants.ts — アプリケーション全体で使用する定数
 *
 * マジックナンバーを排除し、名前付き定数で意図を表現する。
 */

// ============================================================
// Room 関連
// ============================================================

/** ルーム内の最大参加者数 */
export const MAX_PARTICIPANTS = 20;

/** 最低参加者数（クイズ生成に必要な人数）。環境変数で上書き可。 */
export const DEFAULT_MIN_PARTICIPANTS = 3;

/** ルームコードの文字数 */
export const ROOM_CODE_LENGTH = 6;

/** ルームコードに使用する文字セット（紛らわしい文字 0, O, I, l, 1 を除外） */
export const ROOM_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// 32文字: 32^6 ≒ 10億通り。同時50ルーム程度では衝突確率は無視できる

/** ルームの TTL（最終アクティビティからの自動破棄まで） */
export const DEFAULT_ROOM_TIMEOUT_MS = 30 * 60 * 1000; // 30分

/** TTL チェック巡回間隔 */
export const ROOM_CLEANUP_INTERVAL_MS = 60 * 1000; // 60秒

/**
 * 切断した参加者をルームから完全削除するまでの猶予時間。
 * この間に再接続すれば復帰可能。タイムアウト後は参加者一覧から除去される。
 */
export const DISCONNECT_REMOVE_TIMEOUT_MS = 5 * 60 * 1000; // 5分

// ============================================================
// Quiz 関連
// ============================================================

/** 1ゲームあたりの問題数 */
export const TOTAL_QUESTIONS = 10;

/** 1問あたりの制限時間（デフォルト） */
export const DEFAULT_QUESTION_TIME_LIMIT_MS = 30 * 1000; // 30秒

/** 選択肢の最大数 */
export const MAX_CHOICES = 4;

/** 正解時のスコア */
export const SCORE_PER_CORRECT = 100;

// ============================================================
// Profile 関連
// ============================================================

/** プロフィール各フィールドの最大文字数 */
export const MAX_PROFILE_FIELD_LENGTH = 100;

/** プロフィールに必要な最低入力フィールド数（1つ以上の非空フィールドが必要） */
export const MIN_PROFILE_FILLED_FIELDS = 1;

/** ホストが設定できるプロフィール項目の最小数 */
export const MIN_PROFILE_FIELDS = 1;

/** ホストが設定できるプロフィール項目の最大数 */
export const MAX_PROFILE_FIELDS = 10;

/** プロフィール項目ラベルの最大文字数 */
export const MAX_PROFILE_FIELD_LABEL_LENGTH = 30;

/** プロフィール項目プレースホルダーの最大文字数 */
export const MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH = 50;

import type { ProfileFieldDefinition } from "./types/profile.js";

/**
 * デフォルトのプロフィール項目定義。
 * ルーム作成時に初期値として使用される。ホストは自由にカスタマイズ可能。
 */
export const DEFAULT_PROFILE_FIELDS: ProfileFieldDefinition[] = [
    { id: "hometown", label: "出身地", placeholder: "例: 東京都" },
    { id: "hobbies", label: "趣味", placeholder: "例: 映画鑑賞、ジョギング" },
    { id: "skills", label: "特技", placeholder: "例: 料理、プログラミング" },
    { id: "favorite_food", label: "好きな食べ物", placeholder: "例: カレーライス" },
    { id: "surprising_fact", label: "意外な事実", placeholder: "例: 実は3カ国語話せます" },
    { id: "free_text", label: "自由記述", placeholder: "何でもどうぞ！" },
];

/** @deprecated PROFILE_FIELDS は DEFAULT_PROFILE_FIELDS に置き換えられました */
export const PROFILE_FIELDS = DEFAULT_PROFILE_FIELDS.map((f) => f.id);

// ============================================================
// Nickname 関連
// ============================================================

/** ニックネームの最小文字数 */
export const MIN_NICKNAME_LENGTH = 2;

/** ニックネームの最大文字数 */
export const MAX_NICKNAME_LENGTH = 12;

// ============================================================
// AI 関連
// ============================================================

/** Claude API の最大トークン数 */
export const AI_MAX_TOKENS = 4096;

/** AI API リトライ回数 */
export const AI_MAX_RETRIES = 3;

/** AI API リトライの初回待機時間 (ms) */
export const AI_RETRY_BASE_DELAY_MS = 1000;

// ============================================================
// AI リクエスト関連
// ============================================================

/** AI リクエストのプリセット選択肢（参加者がクイズの方向性を提案するための定型文） */
export const AI_REQUEST_PRESETS = [
    "もっと面白い質問にして",
    "趣味に関する項目を増やして",
    "仕事・スキルに関する項目を追加",
    "ユニークな項目を入れて",
    "食べ物系の項目を増やして",
    "旅行・アウトドア系の項目を追加",
    "性格・価値観に関する項目がほしい",
    "カジュアルで答えやすい項目にして",
] as const;

/** AI リクエストの自由テキスト最大文字数 */
export const AI_REQUEST_MAX_FREE_TEXT = 200;

/** AI リクエストの受付タイムアウト（ms） */
export const AI_REQUEST_TIMEOUT_MS = 60 * 1000;

// ============================================================
// レートリミット
// ============================================================

/** room:join のレートリミット（回/分/Socket） */
export const RATE_LIMIT_JOIN_PER_MIN = 10;

/** HTTP 全エンドポイントのレートリミット（回/分/IP） */
export const RATE_LIMIT_HTTP_PER_MIN = 100;

/** レートリミットのウィンドウ */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
