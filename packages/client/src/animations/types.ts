/**
 * animations/types.ts — アニメーションテーマの型定義
 *
 * 各テーマが提供する variants・エフェクト・カラーパレットの構造を定義する。
 * framer-motion の Variants 型を使用し、テーマ間で統一的なインターフェースを保証する。
 */

import type { Variants } from "framer-motion";
import type { ReactNode } from "react";
import type { AnimationThemeName } from "@self-intro-quiz/shared";

/**
 * テーマのカラーパレット。
 * Tailwind CSS クラス文字列で定義し、コンポーネントが直接適用する。
 * 全テーマが同じフィールドを実装することでテンプレートとしての一貫性を保証。
 */
export interface ThemeColors {
    /** ページ背景グラデーション (e.g. "from-blue-50 to-indigo-100") */
    bgGradient: string;
    /** カード背景 (e.g. "bg-white") */
    cardBg: string;
    /** カード枠線 (e.g. "border-gray-200") */
    cardBorder: string;
    /** プライマリボタン背景 (e.g. "bg-indigo-600") */
    buttonPrimary: string;
    /** プライマリボタンホバー (e.g. "hover:bg-indigo-700") */
    buttonPrimaryHover: string;
    /** セカンダリボタン / アクセント色 (e.g. "bg-amber-400") */
    buttonAccent: string;
    /** セカンダリボタンホバー */
    buttonAccentHover: string;
    /** 主テキスト色 (e.g. "text-gray-900") */
    textPrimary: string;
    /** 副テキスト色 (e.g. "text-gray-500") */
    textSecondary: string;
    /** アクセントテキスト色 (e.g. "text-indigo-600") */
    textAccent: string;
    /** 説明ボックス背景 (e.g. "bg-blue-50") */
    explanationBg: string;
    /** 説明ボックステキスト (e.g. "text-blue-900") */
    explanationText: string;
    /** 結果画面ハイライト背景グラデーション (e.g. "from-indigo-50 to-purple-50") */
    highlightGradient: string;

    // --- フォーム入力系プリセット ---

    /** フォーム入力フィールド (背景 + ボーダー + テキスト + placeholder) */
    inputField: string;
    /** フォーム入力フォーカス時 (ring + border) */
    inputFocus: string;
    /** フォームラベル色 */
    labelText: string;

    // --- サーフェス（控えめな背景） ---

    /** 控えめな背景 (e.g. "bg-gray-50") — 非アクティブ状態、淡い区別用 */
    surfaceMuted: string;

    // --- ステータスバッジ ---

    /** 成功バッジ (背景 + テキスト) */
    badgeSuccess: string;
    /** エラーバッジ (背景 + テキスト) */
    badgeError: string;
    /** 警告バッジ (背景 + テキスト) */
    badgeWarning: string;
    /** 無効・不参加バッジ (背景 + テキスト) */
    badgeMuted: string;

    // --- 追加ボタン ---

    /** デンジャーボタン (背景 + テキスト + ボーダー) */
    buttonDanger: string;
    /** ゴーストボタン (ボーダー + テキスト + ホバー) */
    buttonGhost: string;

    // --- モーダル ---

    /** モーダル / ダイアログ背景 (e.g. "bg-white") */
    modalBg: string;

    // --- 選択肢バッジ ---

    /** 選択肢インデックスバッジ (A/B/C/D 丸) 背景 (e.g. "bg-indigo-600") */
    choiceIndexBadge: string;

    // --- 参加者ステータス ---

    /** オンラインインジケータ色 (e.g. "bg-green-400") */
    participantOnline: string;
    /** オフラインインジケータ色 (e.g. "bg-gray-400") */
    participantOffline: string;
    /** 成功チェックマーク色 (e.g. "text-green-500") */
    statusOk: string;

    // --- チップ / タグ ---

    /** 選択済みチップ (背景 + テキスト) (e.g. "bg-indigo-600 text-white") */
    chipSelected: string;
    /** 未選択チップ (背景 + テキスト + ホバー) (e.g. "bg-gray-100 text-gray-700 hover:bg-gray-200") */
    chipDefault: string;

    // --- スピナー ---

    /** ローディングスピナー (トラック + アクティブ) (e.g. "border-indigo-200 border-t-indigo-600") */
    spinner: string;

    // --- プログレスインジケータ ---

    /** 進捗表示 (背景 + テキスト) (e.g. "bg-indigo-50 text-indigo-700") */
    progressIndicator: string;

    // --- リンク ---

    /** テキストリンク色 (e.g. "text-indigo-600") */
    linkText: string;
}

/**
 * アニメーションテーマの設定。
 * 各テーマはこのインターフェースを完全実装し、テンプレートとしての一貫性を保証する。
 */
export interface AnimationThemeConfig {
    /** テーマ識別名 */
    name: AnimationThemeName;

    /** テーマカラーパレット */
    colors: ThemeColors;

    /** framer-motion Variants セット */
    variants: {
        /** 問題カードの登場 */
        questionEntry: Variants;
        /** 問題カードの退場 */
        questionExit: Variants;
        /** 選択肢ボタンの登場（stagger で使用） */
        choiceEntry: Variants;
        /** 正解演出 */
        correctReveal: Variants;
        /** 不正解演出 */
        wrongReveal: Variants;
        /** スコア更新時のハイライト */
        scoreUpdate: Variants;
        /** フェーズ切替トランジション */
        phaseTransition: Variants;
        /** 結果画面の登場 */
        resultEntry: Variants;
        /** 参加者入室 */
        participantJoin: Variants;
    };

    /** テーマ固有のエフェクト */
    effects: {
        /** 正解時に表示するオーバーレイエフェクト（紙吹雪、キラキラ等） */
        onCorrect?: () => ReactNode;
        /** 常時表示の背景パーティクル */
        ambient?: () => ReactNode;
        /** スピーチタイム（interviewing フェーズ）のスポットライト演出。対象者名を受け取る */
        onInterview?: (subjectName: string) => ReactNode;
        /** タイマー緊急時の追加 CSS クラス */
        timerUrgencyClass?: string;
    };

    /** テーマ固有の CSS クラス（ルート要素に適用）。全テーマで定義必須 */
    rootClassName: string;
}
