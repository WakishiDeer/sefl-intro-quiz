/**
 * QuizView — クイズ進行画面
 *
 * playing / revealing フェーズの表示を担当する。
 */

import { useRoomStore } from "../stores/useRoomStore.js";
import { useQuizStore } from "../stores/useQuizStore.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, TOTAL_QUESTIONS } from "@self-intro-quiz/shared";
import { Timer } from "./Timer.js";
import { QuestionCard } from "./QuestionCard.js";
import { ChoiceButton } from "./ChoiceButton.js";
import { Scoreboard } from "./Scoreboard.js";
import { ParticipantList } from "./ParticipantList.js";

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
  const scores = useQuizStore((s) => s.scores);

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

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">問題を読み込み中...</p>
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
          <div className="text-sm text-gray-500">
            回答: {answeredCount} / {totalParticipants}
          </div>
        </div>

        {/* 問題カード */}
        <QuestionCard
          index={currentQuestion.index}
          text={currentQuestion.text}
          totalQuestions={TOTAL_QUESTIONS}
        />

        {/* 途中参加者への案内 */}
        {joinedAtQuestion > currentQuestion.index && phase === "playing" && (
          <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-700">
            この問題は途中参加のため回答できません。次の問題からご参加ください。
          </div>
        )}

        {/* 選択肢 */}
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

        {/* 回答済みメッセージ */}
        {myAnswer !== null && phase === "playing" && (
          <div className="text-center text-sm text-indigo-600">
            回答済み！他の回答者を待っています...
          </div>
        )}

        {/* 正解発表 */}
        {phase === "revealing" && revealedAnswer && (
          <div className="space-y-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="font-medium text-blue-900">💡 {revealedAnswer.explanation}</p>
            </div>

            <Scoreboard scores={scores} compact />

            {/* Host: 次の問題 / 結果を見る */}
            {isHost && (
              <button
                onClick={handleNext}
                className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700"
              >
                {currentQuestion.index < TOTAL_QUESTIONS - 1
                  ? "次の問題へ →"
                  : "結果を見る 🏆"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* サイドバー: 参加者一覧 */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="rounded-xl bg-white p-4 shadow lg:sticky lg:top-4">
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
