/**
 * Room Context — フェーズ・参加者の型定義
 *
 * Room Bounded Context に属する型。ルーム作成・参加者管理・フェーズ遷移に使用。
 */

// ============================================================
// RoomPhase — ルームの状態遷移
// ============================================================

/** ルームのライフサイクルフェーズ */
export type RoomPhase =
    | "lobby" // ロビー（プロフィール入力中）
    | "generating" // クイズ生成中
    | "playing" // クイズ進行中
    | "revealing" // 正解発表中
    | "interviewing" // インタビュータイム（正解発表後、対象者への質問タイム）
    | "finished"; // 全問終了

// ============================================================
// AnimationThemeName — アニメーションテーマ
// ============================================================

/**
 * ルームに適用するアニメーションテーマ。
 * ホストがロビーで選択可能。参加者全員に統一適用される。
 */
export type AnimationThemeName =
    | "subtle"  // 控えめ（デフォルト）
    | "fun"     // 程よく楽しい
    | "cyber"   // サイバー / テック感
    | "party"   // ワイワイ / パーティー
    | "sakura"; // 桜 / 春

// ============================================================
// Participant — 参加者エンティティ（DTO）
// ============================================================

/** 参加者の情報。サーバ内部で管理し、クライアントへの送信時はサブセットを使用する */
export interface Participant {
    /** UUID v4 */
    id: string;
    /** 2〜12文字、ルーム内ユニーク */
    nickname: string;
    /** Socket.IO の socket.id（再接続で更新） */
    socketId: string;
    /** プロフィール情報（null = 未入力） */
    profile: Profile | null;
    /** ホストかどうか */
    isHost: boolean;
    /** 何問目から参加したか (-1 = ロビーから参加) */
    joinedAtQuestion: number;
    /** false = 一時切断中 */
    isConnected: boolean;
    /** Unix timestamp (ms) — Host 移譲時の順序判定用 */
    joinedAt: number;
    /**
     * ブラウザ単位の一意識別子（localStorage に永続化）。
     * 同一ブラウザの別タブから同じルームに重複参加することを防止する。
     * 未設定の場合（レガシー互換）は重複チェックをスキップする。
     */
    clientId?: string;
}

// Profile は profile.ts から re-export するため import
import type { Profile, ProfileFieldDefinition } from "./profile.js";

// ============================================================
// Room — ルーム集約（サーバ内部用DTO）
// ============================================================

/**
 * ルームの全状態。サーバ内部では RoomAggregate クラスが管理する。
 * この interface は Aggregate ↔ Repository 間のデータ受け渡しに使用。
 */
export interface Room {
    /** 英数大文字6文字のルームコード */
    code: string;
    /** Host の participantId */
    hostId: string;
    /** 現在のフェーズ */
    phase: RoomPhase;
    /** key = participantId */
    participants: Map<string, Participant>;
    /**
     * ホストがカスタマイズしたプロフィール入力項目定義。
     * 1〜10項目。デフォルトは DEFAULT_PROFILE_FIELDS。
     */
    profileFields: ProfileFieldDefinition[];
    /** ルームに適用するアニメーションテーマ */
    animationTheme: AnimationThemeName;
    /** Unix timestamp (ms) */
    createdAt: number;
    /** Unix timestamp (ms) — TTL 判定用 */
    lastActivityAt: number;
}
