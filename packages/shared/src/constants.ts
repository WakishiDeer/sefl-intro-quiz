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

/** プロフィールのフィールド名一覧 */
export const PROFILE_FIELDS = [
    "hometown",
    "hobbies",
    "skills",
    "favoriteFood",
    "surprisingFact",
    "freeText",
] as const;

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
// レートリミット
// ============================================================

/** room:join のレートリミット（回/分/Socket） */
export const RATE_LIMIT_JOIN_PER_MIN = 10;

/** HTTP 全エンドポイントのレートリミット（回/分/IP） */
export const RATE_LIMIT_HTTP_PER_MIN = 100;

/** レートリミットのウィンドウ */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
