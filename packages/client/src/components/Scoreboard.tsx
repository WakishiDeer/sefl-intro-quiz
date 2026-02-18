/**
 * Scoreboard — スコアボード表示
 */

import type { ScoreEntry } from "@self-intro-quiz/shared";

interface Props {
  scores: ScoreEntry[];
  compact?: boolean;
}

export function Scoreboard({ scores, compact = false }: Props) {
  return (
    <div className={`rounded-xl bg-white shadow ${compact ? "p-3" : "p-5"}`}>
      {!compact && (
        <h3 className="mb-3 text-lg font-bold text-gray-800">スコアボード</h3>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2 pr-2">#</th>
            <th className="pb-2">名前</th>
            <th className="pb-2 text-right">スコア</th>
            {!compact && <th className="pb-2 text-right">正答率</th>}
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, i) => (
            <tr
              key={entry.nickname}
              className={`border-b last:border-0 ${
                i < 3 ? "font-semibold" : ""
              }`}
            >
              <td className="py-2 pr-2">
                {entry.rank === 1 && "🥇"}
                {entry.rank === 2 && "🥈"}
                {entry.rank === 3 && "🥉"}
                {entry.rank > 3 && entry.rank}
              </td>
              <td className="py-2">
                {entry.nickname}
                {entry.isLateJoiner && (
                  <span className="ml-1 text-xs text-gray-400">(途中参加)</span>
                )}
              </td>
              <td className="py-2 text-right font-mono">{entry.score}</td>
              {!compact && (
                <td className="py-2 text-right text-gray-500">
                  {entry.totalQuestions > 0
                    ? `${entry.correctCount}/${entry.totalQuestions}`
                    : "-"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
