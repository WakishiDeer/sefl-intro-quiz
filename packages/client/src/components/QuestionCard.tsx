/**
 * QuestionCard — 問題表示カード
 *
 * 4択問題と⭕❌問題で異なるスタイルを適用する。
 * 問題切替時にテーマ対応のアニメーションを適用。
 */

import { motion } from "framer-motion";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
  index: number;
  text: string;
  totalQuestions: number;
  /** ⭕❌問題の場合 true */
  yesNo?: boolean;
}

export function QuestionCard({ index, text, totalQuestions, yesNo }: Props) {
  const theme = useAnimationTheme();

  return (
    <motion.div
      key={index}
      variants={theme.variants.questionEntry}
      initial="initial"
      animate="animate"
      className={`rounded-xl p-6 shadow-lg ${yesNo ? `${theme.colors.badgeWarning} border-2` : theme.colors.cardBg}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`text-sm font-medium ${theme.colors.textAccent}`}>
          Q{index + 1} / {totalQuestions}
        </span>
        {yesNo && (
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${theme.colors.badgeWarning}`}>
            ⭕❌
          </span>
        )}
      </div>
      <h2 className={`text-xl font-bold ${theme.colors.textPrimary}`}>{text}</h2>
    </motion.div>
  );
}
