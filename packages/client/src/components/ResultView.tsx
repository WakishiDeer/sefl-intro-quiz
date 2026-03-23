/**
 * ResultView — 最終結果画面
 *
 * 全問終了後にスコアボード + ハイライトをテーマ対応アニメーションで表示する。
 */

import { motion } from "framer-motion";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS } from "@self-intro-quiz/shared";
import { Scoreboard } from "./Scoreboard.js";
import { QuestionResultsList } from "./QuestionResultsList.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

export function ResultView() {
  const isHost = useRoomStore((s) => s.isHost);
  const finalScores = useQuizStore((s) => s.finalScores);
  const highlights = useQuizStore((s) => s.highlights);
  const questionResults = useQuizStore((s) => s.questionResults);
  const theme = useAnimationTheme();

  const handleBackToLobby = () => {
    socket.emit(C2S_EVENTS.ROOM_BACK_TO_LOBBY);
  };

  const handleCloseRoom = () => {
    if (confirm("ルームを閉じますか？")) {
      socket.emit(C2S_EVENTS.ROOM_CLOSE);
    }
  };

  // 1位を取得
  const winner = finalScores[0];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pt-8">
      <motion.div
        className="text-center"
        variants={theme.variants.resultEntry}
        initial="initial"
        animate="animate"
        custom={0}
      >
        <h1 className={`text-3xl font-bold ${theme.colors.textPrimary}`}>🏆 結果発表</h1>
        {winner && (
          <p className={`mt-2 text-lg ${theme.colors.textSecondary}`}>
            優勝: <span className={`font-bold ${theme.colors.textAccent}`}>{winner.nickname}</span>
            <span className="ml-2 font-mono">{winner.score}pt</span>
          </p>
        )}
      </motion.div>

      <motion.div
        variants={theme.variants.resultEntry}
        initial="initial"
        animate="animate"
        custom={1}
      >
        <Scoreboard scores={finalScores} />
      </motion.div>

      {highlights.length > 0 && (
        <motion.div
          className={`rounded-xl ${theme.colors.cardBg} p-5 shadow`}
          variants={theme.variants.resultEntry}
          initial="initial"
          animate="animate"
          custom={2}
        >
          <h3 className={`mb-4 text-lg font-bold ${theme.colors.textPrimary}`}>✨ ハイライト</h3>
          <div className="space-y-3">
            {highlights.map((h, i) => (
              <motion.div
                key={i}
                className={`flex items-start gap-3 rounded-lg bg-gradient-to-r ${theme.colors.highlightGradient} p-3`}
                variants={theme.variants.resultEntry}
                initial="initial"
                animate="animate"
                custom={3 + i}
              >
                <span className="text-2xl leading-none">{h.emoji}</span>
                <div>
                  <p className={`font-bold ${theme.colors.textPrimary}`}>{h.title}</p>
                  <p className={`text-sm ${theme.colors.textSecondary}`}>{h.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 各問題の回答結果 */}
      {questionResults.length > 0 && (
        <motion.div
          variants={theme.variants.resultEntry}
          initial="initial"
          animate="animate"
          custom={highlights.length + 3}
        >
          <QuestionResultsList questionResults={questionResults} />
        </motion.div>
      )}

      {isHost && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleBackToLobby}
            className={`rounded-lg ${theme.colors.buttonPrimary} px-6 py-3 font-semibold text-white transition ${theme.colors.buttonPrimaryHover}`}
          >
            ロビーに戻る
          </button>
          <button
            onClick={handleCloseRoom}
            className="rounded-lg bg-gray-600 px-6 py-3 font-semibold text-white transition hover:bg-gray-700"
          >
            ルームを閉じる
          </button>
        </div>
      )}
    </div>
  );
}
