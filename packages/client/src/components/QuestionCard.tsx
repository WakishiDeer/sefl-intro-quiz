/**
 * QuestionCard — 問題表示カード
 */

interface Props {
  index: number;
  text: string;
  totalQuestions: number;
}

export function QuestionCard({ index, text, totalQuestions }: Props) {
  return (
    <div className="rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-2 text-sm font-medium text-indigo-500">
        Q{index + 1} / {totalQuestions}
      </div>
      <h2 className="text-xl font-bold text-gray-900">{text}</h2>
    </div>
  );
}
