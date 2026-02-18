/**
 * ChoiceButton — 選択肢ボタン
 */

interface Props {
  label: string;
  index: number;
  selected: boolean;
  correct: boolean | null; // null = 未発表
  disabled: boolean;
  onClick: () => void;
}

const LABELS = ["A", "B", "C", "D"];

export function ChoiceButton({ label, index, selected, correct, disabled, onClick }: Props) {
  let bgClass = "bg-white hover:bg-indigo-50 border-gray-200";

  if (correct === true) {
    bgClass = "bg-green-100 border-green-400 ring-2 ring-green-400";
  } else if (correct === false && selected) {
    bgClass = "bg-red-100 border-red-400";
  } else if (selected) {
    bgClass = "bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${bgClass} disabled:cursor-not-allowed`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
        {LABELS[index]}
      </span>
      <span className="text-lg font-medium text-gray-800">{label}</span>
    </button>
  );
}
