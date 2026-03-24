/**
 * reaction.ts — リアクション関連の型定義
 *
 * ルーム内でリアルタイムに絵文字・テキストリアクションを送受信するための型。
 * リアクションは3カテゴリ: 絵文字 / テキスト / テーマ固有。
 */

// ============================================================
// リアクション定義
// ============================================================

/** リアクションの種別 */
export type ReactionType = "emoji" | "text";

/**
 * リアクション1件の定義。
 * ボタン表示・パーティクル描画の両方で使用される。
 */
export interface ReactionDefinition {
    /** 一意な識別子 (e.g. "emoji-clap", "text-sugoi", "theme-sakura") */
    id: string;
    /** リアクション種別 */
    type: ReactionType;
    /** ボタン・パーティクルに表示する文字列（絵文字またはテキスト） */
    display: string;
    /** アクセシビリティラベル / ツールチップ */
    label: string;
    /** true の場合、等幅フォント（ターミナル風）で描画する */
    mono?: boolean;
}

// ============================================================
// Socket.IO ペイロード
// ============================================================

/** reaction:send (C2S) ペイロード */
export interface SendReactionPayload {
    /** 送信するリアクションの ID */
    reactionId: string;
}

/** reaction:received (S2C) ペイロード */
export interface ReactionReceivedPayload {
    /** リアクション ID */
    reactionId: string;
    /** 送信者のニックネーム */
    senderNickname: string;
    /** 表示文字列（クライアント側でのルックアップ負荷を避けるためサーバが含める） */
    display: string;
    /** リアクション種別 */
    type: ReactionType;
    /** true の場合、等幅フォント（ターミナル風）で描画する */
    mono?: boolean;
}
