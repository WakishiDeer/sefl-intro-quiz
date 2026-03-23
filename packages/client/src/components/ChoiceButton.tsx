/**
 * ChoiceButton — 選択肢ボタン
 *
 * 4択問題用（A/B/C/D）と ⭕❌問題用の2つの表示モードをサポート。
 * 正解発表時にテーマ対応のアニメーションで正誤を直感的に伝える。
 */

import { motion } from "framer-motion";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
  label: string;
  index: number;
  selected: boolean;
  correct: boolean | null; // null = 未発表
  disabled: boolean;
  onClick: () => void;
  /** ⭕❌問題の場合 true — 大きめの横並びボタンで表示 */
  yesNo?: boolean;
}

const LABELS = ["A", "B", "C", "D"];

export function ChoiceButton({ label, index, selected, correct, disabled, onClick, yesNo }: Props) {
  const theme = useAnimationTheme();

  // 正解発表時のアニメーション variants を選択
  const revealVariants = correct === true
    ? theme.variants.correctReveal
    : correct === false && selected
      ? theme.variants.wrongReveal
      : undefined;

  // 不正解 + 未選択のフェードアウト（CSS transition のまま維持）
  const unselectedWrongClass = correct === false && !selected ? "choice-wrong-unselected" : "";

  // --- 背景・ボーダー ---
  let bgClass = `${theme.colors.surfaceMuted} ${theme.colors.cardBorder} hover:opacity-80`;

  if (correct === true) {
    bgClass = selected
      ? `${theme.colors.badgeSuccess} ring-2 ring-green-400 shadow-md`
      : `${theme.colors.badgeSuccess} ring-2 ring-green-400/50`;
  } else if (correct === false && selected) {
    bgClass = theme.colors.badgeError;
  } else if (correct === false) {
    bgClass = `${theme.colors.surfaceMuted} ${theme.colors.cardBorder}`;
  } else if (selected) {
    bgClass = `${theme.colors.buttonPrimary} text-white ring-2 ring-offset-1`;
  }

  if (yesNo) {
    const emoji = index === 0 ? "⭕" : "❌";
    const defaultTint = index === 0 ? `${theme.colors.badgeSuccess} border-green-400/40` : `${theme.colors.badgeError} border-red-400/40`;

    let yesNoBg = defaultTint;
    if (correct === true) {
      yesNoBg = selected
        ? `${theme.colors.badgeSuccess} ring-2 ring-green-400 shadow-md`
        : `${theme.colors.badgeSuccess} ring-2 ring-green-400/50`;
    } else if (correct === false && selected) {
      yesNoBg = `${theme.colors.badgeError} ring-2 ring-red-400`;
    } else if (correct === false) {
      yesNoBg = `${theme.colors.badgeMuted} opacity-50`;
    } else if (selected) {
      yesNoBg = index === 0
        ? `${theme.colors.badgeSuccess} ring-2 ring-green-400`
        : `${theme.colors.badgeError} ring-2 ring-red-400`;
    }

    const badge =
      correct === true
        ? "✓"
        : correct === false && selected
          ? "✗"
          : null;

    const labelColor =
      correct === true
        ? ""
        : correct === false && selected
          ? ""
          : correct === false
            ? theme.colors.textSecondary
            : theme.colors.textPrimary;

    return (
      <motion.button
        variants={revealVariants ?? theme.variants.choiceEntry}
        initial={revealVariants ? "initial" : "initial"}
        animate="animate"
        custom={index}
        onClick={onClick}
        disabled={disabled}
        className={`relative flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-6 py-5 transition-colors duration-300 ${yesNoBg} ${unselectedWrongClass} disabled:cursor-not-allowed`}
      >
        {badge && (
          <span
            className={`absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white ${
              correct ? "bg-green-500" : "bg-red-400"
            }`}
          >
            {badge}
          </span>
        )}
        <span className="text-4xl">{emoji}</span>
        <span className={`text-base font-semibold ${labelColor}`}>
          {index === 0 ? "はい" : "いいえ"}
        </span>
        {/* 正解時のエフェクト */}
        {correct === true && selected && theme.effects.onCorrect && (
          <>{theme.effects.onCorrect()}</>
        )}
      </motion.button>
    );
  }

  return (
    <motion.button
      variants={revealVariants ?? theme.variants.choiceEntry}
      initial={revealVariants ? "initial" : "initial"}
      animate="animate"
      custom={index}
      onClick={onClick}
      disabled={disabled}
      className={`relative flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-colors duration-300 ${bgClass} ${unselectedWrongClass} disabled:cursor-not-allowed`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          correct === true
            ? "bg-green-500"
            : correct === false && selected
              ? "bg-red-400"
              : theme.colors.choiceIndexBadge
        }`}
      >
        {correct === true ? "✓" : correct === false && selected ? "✗" : LABELS[index]}
      </span>
      <span className={`text-lg font-medium ${theme.colors.textPrimary}`}>{label}</span>
      {/* 正解時のエフェクト */}
      {correct === true && selected && theme.effects.onCorrect && (
        <>{theme.effects.onCorrect()}</>
      )}
    </motion.button>
  );
}
