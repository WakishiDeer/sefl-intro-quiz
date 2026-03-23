/**
 * QuestionResultsList — 全問題の回答結果一覧
 *
 * 結果画面で各問題ごとに「誰が正解・不正解か」をアコーディオン形式で表示する。
 * 途中参加・離脱した参加者も考慮して表示する。
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { QuestionResultSummary } from "@self-intro-quiz/shared";
import { AnswerResultList } from "./AnswerResultList.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

interface Props {
    questionResults: QuestionResultSummary[];
}

export function QuestionResultsList({ questionResults }: Props) {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const theme = useAnimationTheme();

    const toggle = (qi: number) => {
        setOpenIndex((prev) => (prev === qi ? null : qi));
    };

    if (questionResults.length === 0) return null;

    return (
        <div className={`rounded-xl ${theme.colors.cardBg} p-5 shadow`}>
            <h3 className={`mb-4 text-lg font-bold ${theme.colors.textPrimary}`}>📋 各問題の回答結果</h3>
            <div className="space-y-2">
                {questionResults.map((qr) => {
                    const correctCount = qr.participantResults.filter((r) => r.isCorrect).length;
                    const eligibleCount = qr.participantResults.filter((r) => !r.isIneligible).length;
                    const isOpen = openIndex === qr.questionIndex;
                    const correctRate = eligibleCount > 0
                        ? Math.round((correctCount / eligibleCount) * 100)
                        : 0;

                    return (
                        <div key={qr.questionIndex}>
                            <button
                                onClick={() => toggle(qr.questionIndex)}
                                className={`w-full rounded-lg px-4 py-3 text-left transition ${
                                    isOpen
                                        ? `${theme.colors.buttonPrimary} text-white`
                                        : `${theme.colors.explanationBg} ${theme.colors.textPrimary}`
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`text-xs font-bold shrink-0 ${isOpen ? "text-white/80" : theme.colors.textAccent}`}>
                                            Q{qr.questionIndex + 1}
                                        </span>
                                        <span className="truncate text-sm">
                                            {qr.text}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className={`text-xs ${isOpen ? "text-white/80" : theme.colors.textSecondary}`}>
                                            正答率 {correctRate}%
                                        </span>
                                        <span className={`text-xs transition-transform ${isOpen ? "rotate-180" : ""}`}>
                                            ▼
                                        </span>
                                    </div>
                                </div>
                            </button>
                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 py-3">
                                            <p className={`mb-2 text-xs ${theme.colors.textSecondary}`}>
                                                正解: {qr.choices[qr.correctIndex]}
                                            </p>
                                            <AnswerResultList results={qr.participantResults} />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
