/**
 * quizCount.ts — クイズ問題数の動的計算
 *
 * 参加者数とプロフィール項目数に基づいて、最適なクイズ問題数を算出する。
 * Room Context が参照する純粋関数として設計し、ドメインロジックに外部依存を持たせない。
 */

import { MIN_QUESTIONS, MAX_QUESTIONS, YES_NO_RATIO } from "./constants.js";

// ============================================================
// QuizCountConfig — 計算結果の型
// ============================================================

/** クイズ問題数の構成情報 */
export interface QuizCountConfig {
    /** 総問題数 */
    totalQuestions: number;
    /** ⭕❌問題の数 */
    yesNoCount: number;
    /** 4択問題の数 */
    fourChoiceCount: number;
}

// ============================================================
// calculateQuizCount
// ============================================================

/**
 * 参加者数とプロフィール入力済みフィールド数からクイズ問題数を算出する。
 *
 * 計算式:
 *   base = participantCount × 2
 *   fieldBonus = max(0, floor((profileFieldCount - 3) / 2))
 *   total = clamp(base + fieldBonus, MIN_QUESTIONS, MAX_QUESTIONS)
 *
 * ⭕❌問題と4択問題の比率は YES_NO_RATIO (40%) で固定。
 *
 * @param participantCount - プロフィール入力済みの参加者数
 * @param profileFieldCount - ルームのプロフィール項目数
 * @returns QuizCountConfig
 *
 * @example
 * calculateQuizCount(3, 6) // => { totalQuestions: 7, yesNoCount: 3, fourChoiceCount: 4 }
 * calculateQuizCount(5, 6) // => { totalQuestions: 11, yesNoCount: 4, fourChoiceCount: 7 }
 * calculateQuizCount(10, 6) // => { totalQuestions: 20, yesNoCount: 8, fourChoiceCount: 12 }
 * calculateQuizCount(3, 1) // => { totalQuestions: 6, yesNoCount: 2, fourChoiceCount: 4 }
 */
export function calculateQuizCount(
    participantCount: number,
    profileFieldCount: number,
): QuizCountConfig {
    // 各参加者につき2問を基本とする
    const base = participantCount * 2;

    // プロフィール項目が3つを超えるごとに+1問（情報量が多いほどバリエーション増）
    const fieldBonus = Math.max(0, Math.floor((profileFieldCount - 3) / 2));

    // MIN_QUESTIONS 〜 MAX_QUESTIONS の範囲にクランプ
    const totalQuestions = Math.min(Math.max(base + fieldBonus, MIN_QUESTIONS), MAX_QUESTIONS);

    // ⭕❌問題数を比率から算出（最低1問は確保）
    const yesNoCount = Math.max(1, Math.round(totalQuestions * YES_NO_RATIO));
    const fourChoiceCount = totalQuestions - yesNoCount;

    return { totalQuestions, yesNoCount, fourChoiceCount };
}
