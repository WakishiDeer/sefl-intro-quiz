/**
 * Scoreboard — スコアボード表示
 *
 * テーマ対応のスコア更新アニメーション付き。
 */

import { motion, AnimatePresence } from "framer-motion";
import type { ScoreEntry } from "@self-intro-quiz/shared";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
  scores: ScoreEntry[];
  compact?: boolean;
}

export function Scoreboard({ scores, compact = false }: Props) {
  const theme = useAnimationTheme();

  return (
    <div className={`rounded-xl ${theme.colors.cardBg} shadow ${compact ? "p-3" : "p-5"}`}>
      {!compact && (
        <h3 className={`mb-3 text-lg font-bold ${theme.colors.textPrimary}`}>スコアボード</h3>
      )}
      <table className={`w-full text-sm ${theme.colors.textPrimary}`}>
        <thead>
          <tr className={`border-b border-current/20 text-left ${theme.colors.textSecondary}`}>
            <th className="w-10 pb-2 pr-2">#</th>
            <th className="pb-2">名前</th>
            <th className="pb-2 text-right">スコア</th>
            {!compact && <th className="pb-2 text-right">正答率</th>}
            {!compact && <th className="w-16 pb-2 text-right">🔥</th>}
          </tr>
        </thead>
        <AnimatePresence>
          <tbody>
            {scores.map((entry, i) => (
              <motion.tr
                key={entry.nickname}
                layout
                variants={theme.variants.scoreUpdate}
                initial={false}
                animate="animate"
                className={`border-b border-current/20 last:border-0 ${
                  i < 3 ? "font-semibold" : ""
                }`}
              >
                <td className="w-10 py-2 pr-2 text-center">
                  {entry.rank === 1 && "🥇"}
                  {entry.rank === 2 && "🥈"}
                  {entry.rank === 3 && "🥉"}
                  {entry.rank > 3 && entry.rank}
                </td>
                <td className="py-2">
                  {entry.nickname}
                  {entry.isLateJoiner && (
                    <span className={`ml-1 text-xs ${theme.colors.textSecondary}`}>(途中参加)</span>
                  )}
                </td>
                <td className="py-2 text-right font-mono">{entry.score}</td>
                {!compact && (
                  <td className={`py-2 text-right ${theme.colors.textSecondary}`}>
                    {entry.totalQuestions > 0
                      ? `${entry.correctCount}/${entry.totalQuestions}`
                      : "-"}
                  </td>
                )}
                {!compact && (
                  <td className={`py-2 text-right font-mono text-xs ${theme.colors.textSecondary}`}>
                    {entry.maxStreak >= 2 ? `${entry.maxStreak}連` : "-"}
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </AnimatePresence>
      </table>
    </div>
  );
}
