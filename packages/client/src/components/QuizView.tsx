/**
 * QuizView — クイズ進行画面
 *
 * playing / revealing / interviewing フェーズの表示を担当する。
 */

import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS } from "@self-intro-quiz/shared";
import { Timer } from "./Timer.js";
import { QuestionCard } from "./QuestionCard.js";
import { ChoiceButton } from "./ChoiceButton.js";
import { Scoreboard } from "./Scoreboard.js";
import { ParticipantList } from "./ParticipantList.js";
import { AnswerResultList } from "./AnswerResultList.js";

export function QuizView() {
  const phase = useRoomStore((s) => s.phase);
  const isHost = useRoomStore((s) => s.isHost);
  const joinedAtQuestion = useRoomStore((s) => s.joinedAtQuestion);
  const nickname = useRoomStore((s) => s.nickname);

  const currentQuestion = useQuizStore((s) => s.currentQuestion);
  const timerEndsAt = useQuizStore((s) => s.timerEndsAt);
  const myAnswer = useQuizStore((s) => s.myAnswer);
  const answeredCount = useQuizStore((s) => s.answeredCount);
  const totalParticipants = useQuizStore((s) => s.totalParticipants);
  const answeredNicknames = useQuizStore((s) => s.answeredNicknames);
  const revealedAnswer = useQuizStore((s) => s.revealedAnswer);
  const participantResults = useQuizStore((s) => s.participantResults);
  const scores = useQuizStore((s) => s.scores);
  const hasVotedCurious = useQuizStore((s) => s.hasVotedCurious);
  const interviewSpeech = useQuizStore((s) => s.interviewSpeech);
  const totalQuestions = useQuizStore((s) => s.totalQuestions);
  const theme = useAnimationTheme();

  const canAnswer =
    phase === "playing" &&
    myAnswer === null &&
    currentQuestion !== null &&
    (joinedAtQuestion === -1 || joinedAtQuestion <= currentQuestion.index);

  const handleAnswer = (choiceIndex: number) => {
    if (!canAnswer || !currentQuestion) return;

    useQuizStore.getState().setMyAnswer(choiceIndex);
    socket.emit(C2S_EVENTS.QUESTION_ANSWER, {
      questionIndex: currentQuestion.index,
      choiceIndex,
    });
  };

  const handleNext = () => {
    socket.emit(C2S_EVENTS.QUIZ_NEXT_QUESTION);
  };

  const handleVoteCurious = () => {
    if (!currentQuestion || hasVotedCurious) return;
    useQuizStore.getState().setVotedCurious();
    socket.emit(C2S_EVENTS.QUIZ_VOTE_CURIOUS, {
      questionIndex: currentQuestion.index,
    });
  };

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className={theme.colors.textSecondary}>問題を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 pt-8 max-w-5xl mx-auto">
      {/* メインエリア: 問題・選択肢 */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* ヘッダ: タイマー + 回答状況 */}
        <div className="flex items-center justify-between">
          <Timer timerEndsAt={timerEndsAt} />
          {phase === "playing" && (
            <div className={`text-sm ${theme.colors.textSecondary}`}>
              回答: {answeredCount} / {totalParticipants}
            </div>
          )}
          {phase === "interviewing" && (
            <div className={`text-sm font-medium ${theme.colors.textAccent}`}>
              スピーチ中
            </div>
          )}
        </div>

        {/* 問題カード — interviewing 中はスポットライト演出を優先して非表示 */}
        {phase !== "interviewing" && (
          <QuestionCard
            index={currentQuestion.index}
            text={currentQuestion.text}
            totalQuestions={totalQuestions}
            yesNo={currentQuestion.questionType === "yes-no"}
          />
        )}

        {/* 途中参加者への案内 */}
        {joinedAtQuestion > currentQuestion.index && phase === "playing" && (
          <div className={`rounded-lg ${theme.colors.badgeWarning} p-3 text-center text-sm`}>
            この問題は途中参加のため回答できません。次の問題からご参加ください。
          </div>
        )}

        {/* 選択肢 — interviewing 中は非表示 */}
        {phase !== "interviewing" && (currentQuestion.questionType === "yes-no" ? (
          /* ⭕❌問題: 「どっちだ！？」ヘッダ + 横並びボタン */
          <div className="space-y-3">
            <div className="text-center">
              <span className={`inline-block rounded-full px-4 py-1 text-sm font-bold ${theme.colors.badgeWarning}`}>
                ⭕ or ❌ どっちだ！？
              </span>
            </div>
            <div className="flex gap-3">
              {currentQuestion.choices.map((choice, i) => {
                let correct: boolean | null = null;
                if (revealedAnswer) {
                  correct = i === revealedAnswer.correctIndex;
                }
                return (
                  <ChoiceButton
                    key={i}
                    label={choice}
                    index={i}
                    selected={myAnswer === i}
                    correct={correct}
                    disabled={!canAnswer}
                    onClick={() => handleAnswer(i)}
                    yesNo
                  />
                );
              })}
            </div>
          </div>
        ) : (
          /* 4択問題: 従来の縦並びボタン */
          <div className="space-y-2">
            {currentQuestion.choices.map((choice, i) => {
              let correct: boolean | null = null;
              if (revealedAnswer) {
                correct = i === revealedAnswer.correctIndex;
              }

              return (
                <ChoiceButton
                  key={i}
                  label={choice}
                  index={i}
                  selected={myAnswer === i}
                  correct={correct}
                  disabled={!canAnswer}
                  onClick={() => handleAnswer(i)}
                />
              );
            })}
          </div>
        ))}

        {/* 回答済みメッセージ */}
        {myAnswer !== null && phase === "playing" && (
          <div className={`text-center text-sm ${theme.colors.textAccent}`}>
            回答済み！他の回答者を待っています...
          </div>
        )}

        {/* 正解発表 */}
        {phase === "revealing" && revealedAnswer && (
          <div className="space-y-4">
            <div className={`rounded-xl ${theme.colors.explanationBg} p-4`}>
              <p className={`font-medium ${theme.colors.explanationText}`}>💡 {revealedAnswer.explanation}</p>
            </div>

            {/* 回答結果: 誰が正解・不正解か */}
            {participantResults.length > 0 && (
              <div className={`rounded-xl ${theme.colors.cardBg} p-4 shadow`}>
                <h4 className={`mb-2 text-sm font-bold ${theme.colors.textSecondary}`}>回答結果</h4>
                <AnswerResultList results={participantResults} compact />
              </div>
            )}

            {/* 「気になる👀」投票ボタン（全参加者） */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleVoteCurious}
                disabled={hasVotedCurious}
                className={`min-w-48 rounded-full px-8 py-2.5 text-base font-semibold transition ${
                  hasVotedCurious
                    ? `${theme.colors.badgeWarning} cursor-default`
                    : `${theme.colors.buttonAccent} text-white ${theme.colors.buttonAccentHover} active:scale-95`
                }`}
              >
                {hasVotedCurious ? "✓ 気になる！" : "気になる👀"}
              </button>
              <p className={`mt-1.5 text-xs ${theme.colors.textSecondary}`}>
                もっと知りたいと思ったらタップ！
              </p>
            </div>

            <Scoreboard scores={scores} compact />

            {/* Host: 次の問題 */}
            {isHost && (
              <button
                onClick={handleNext}
                className={`w-full rounded-lg ${theme.colors.buttonPrimary} px-4 py-3 text-lg font-semibold text-white transition ${theme.colors.buttonPrimaryHover}`}
              >
                {currentQuestion.index < totalQuestions - 1
                  ? "次の問題へ →"
                  : "結果を見る 🏆"}
              </button>
            )}
          </div>
        )}

        {/* スピーチタイム — スポットライト演出に集中。スコア等は revealing で表示済み */}
        {phase === "interviewing" && interviewSpeech && (
          <>
            {/* スポットライト演出（名前・バッジ・デコ込み） */}
            {theme.effects.onInterview?.(interviewSpeech.subjectNickname)}

            {/* Host: 次の問題 / 結果を見る — オーバーレイ(z-20)の上に固定表示 */}
            {isHost && (
              <div className="fixed inset-x-0 bottom-8 z-30 mx-auto max-w-lg px-4">
                <button
                  onClick={handleNext}
                  className={`w-full rounded-lg ${theme.colors.buttonPrimary} px-4 py-3 text-lg font-semibold text-white shadow-2xl transition ${theme.colors.buttonPrimaryHover}`}
                >
                  {currentQuestion.index < totalQuestions - 1
                    ? "次の問題へ →"
                    : "結果を見る 🏆"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* サイドバー: 参加者一覧 */}
      <div className="w-full lg:w-64 shrink-0">
        <div className={`rounded-xl ${theme.colors.cardBg} p-4 shadow lg:sticky lg:top-4`}>
          <ParticipantList
            mode="quiz"
            currentNickname={nickname}
            answeredNicknames={answeredNicknames}
          />
        </div>
      </div>
    </div>
  );
}
