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

/** 1ゲームあたりのデフォルト問題数 */
export const TOTAL_QUESTIONS = 10;

/** 問題数の最小値 */
export const MIN_QUESTIONS = 5;

/** 問題数の最大値 */
export const MAX_QUESTIONS = 20;

/** ⭕❌問題の割合（40%） */
export const YES_NO_RATIO = 0.4;

/** 1問あたりの制限時間（デフォルト） */
export const DEFAULT_QUESTION_TIME_LIMIT_MS = 30 * 1000; // 30秒

/** 選択肢の最大数 */
export const MAX_CHOICES = 4;

/** ⭕❌問題の固定選択肢 */
export const YES_NO_CHOICES = ["⭕ はい", "❌ いいえ"] as const;

/** デフォルト10問中の⭕❌問題数 */
export const YES_NO_QUESTION_COUNT = 4;

/** デフォルト10問中の4択問題数 */
export const FOUR_CHOICE_QUESTION_COUNT = TOTAL_QUESTIONS - YES_NO_QUESTION_COUNT;

/** 正解時のスコア */
export const SCORE_PER_CORRECT = 100;

/** インタビュースピーチの制限時間 */
export const INTERVIEW_SPEECH_DURATION_MS = 60 * 1000; // 1分

/** 「気になる」投票の閾値（50%以上でスピーチ発動） */
export const CURIOUS_VOTE_THRESHOLD = 0.5;

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
import type { AnimationThemeName } from "./types/room.js";

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

/** AI API の最大トークン数 */
export const AI_MAX_TOKENS = 4096;

/** AI API リトライ回数 */
export const AI_MAX_RETRIES = 3;

/** AI API リトライの初回待機時間 (ms) */
export const AI_RETRY_BASE_DELAY_MS = 1000;

// ============================================================
// AI リクエスト関連
// ============================================================

/**
 * AI リクエストのプリセット選択肢プール。
 * 参加者がクイズの方向性を提案するための定型文。
 * 毎回ランダムに AI_REQUEST_DISPLAY_COUNT 個を表示する。
 */
export const AI_REQUEST_PRESETS = [
    // --- 雰囲気・難易度 ---
    "もっと面白い質問にして",
    "ユニークな項目を入れて",
    "カジュアルで答えやすい項目にして",
    "ちょっとマニアックな質問を入れて",
    // --- 趣味・エンタメ ---
    "趣味に関する項目を増やして",
    "音楽・映画・エンタメ系の項目を追加",
    "スポーツ・運動に関する項目がほしい",
    "ゲーム・マンガ・アニメ系を入れて",
    // --- 仕事・スキル ---
    "仕事・スキルに関する項目を追加",
    "特技・隠れた才能を聞く項目がほしい",
    // --- 食べ物・ライフスタイル ---
    "食べ物系の項目を増やして",
    "朝型?夜型?など生活習慣系を入れて",
    "マイブーム・最近ハマっていることを聞きたい",
    // --- 旅行・場所 ---
    "旅行・アウトドア系の項目を追加",
    "おすすめスポットやお店を聞く項目がほしい",
    // --- 性格・価値観 ---
    "性格・価値観に関する項目がほしい",
    "座右の銘や好きな言葉を聞きたい",
    "休日の過ごし方を知りたい",
    // --- 思い出・エピソード ---
    "子どもの頃の思い出系を入れて",
    "学生時代のエピソードを聞きたい",
    "ちょっとした失敗談・おもしろエピソード系",
    // --- 想像・仮定 ---
    "\"もしも〇〇だったら\"系の質問を入れて",
    "最近買ってよかったものを聞きたい",
    // --- ペット・動物 ---
    "ペットや好きな動物について聞きたい",
] as const;

/** モーダルに一度に表示するプリセット数 */
export const AI_REQUEST_DISPLAY_COUNT = 8;

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

// ============================================================
// アニメーションテーマ
// ============================================================

/** 選択可能なアニメーションテーマ一覧 */
export const ANIMATION_THEMES: readonly AnimationThemeName[] = [
    "subtle",
    "fun",
    "cyber",
    "party",
    "sakura",
] as const;

/** デフォルトのアニメーションテーマ */
export const DEFAULT_ANIMATION_THEME: AnimationThemeName = "subtle";

/** テーマごとの表示用メタ情報 */
export const ANIMATION_THEME_META: Record<AnimationThemeName, { icon: string; label: string; description: string }> = {
    subtle: { icon: "🎵", label: "控えめ", description: "上品なフェードやスライドで落ち着いた雰囲気" },
    fun: { icon: "✨", label: "楽しい", description: "バウンスやスパークルでクイズ番組風" },
    cyber: { icon: "💻", label: "サイバー", description: "ネオングローとグリッチでテック感" },
    party: { icon: "🎉", label: "パーティー", description: "紙吹雪と大きな動きで盛り上がる！" },
    sakura: { icon: "🌸", label: "サクラ", description: "桜吹雪と柔らかな動きで春の雰囲気" },
};

export const RATE_LIMIT_HTTP_PER_MIN = 100;

/** レートリミットのウィンドウ */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1分
