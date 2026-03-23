/**
 * AnswerResultList — 各問題における参加者の正解・不正解を一覧表示するコンポーネント
 *
 * revealing フェーズで現在の問題の回答結果を表示し、
 * ResultView で全問題の回答結果を一覧表示するために使用する。
 */

import { motion } from "framer-motion";
import type { ParticipantAnswerResult } from "@self-intro-quiz/shared";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import type { ThemeColors } from "../animations/types.js";

interface Props {
    results: ParticipantAnswerResult[];
    /** コンパクト表示（revealing フェーズ用） */
    compact?: boolean;
}

export function AnswerResultList({ results, compact = false }: Props) {
    const theme = useAnimationTheme();

    // 正解 → 不正解 → タイムアウト → 不参加 の順に並べる
    const sorted = [...results].sort((a, b) => {
        const order = (r: ParticipantAnswerResult) => {
            if (r.isIneligible) return 3;
            if (r.isTimeout) return 2;
            if (r.isCorrect) return 0;
            return 1;
        };
        return order(a) - order(b);
    });

    return (
        <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}>
            {sorted.map((r) => (
                <motion.span
                    key={r.nickname}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${getStyle(r, theme.colors)}`}
                >
                    <span>{getIcon(r)}</span>
                    <span>{r.nickname}</span>
                </motion.span>
            ))}
        </div>
    );
}

function getIcon(r: ParticipantAnswerResult): string {
    if (r.isIneligible) return "➖";
    if (r.isTimeout) return "⏰";
    if (r.isCorrect) return "⭕";
    return "❌";
}

function getStyle(r: ParticipantAnswerResult, colors: ThemeColors): string {
    if (r.isIneligible) return colors.badgeMuted;
    if (r.isTimeout) return colors.badgeWarning;
    if (r.isCorrect) return colors.badgeSuccess;
    return colors.badgeError;
}
