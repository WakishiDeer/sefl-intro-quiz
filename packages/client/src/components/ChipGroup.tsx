/**
 * ChipGroup — 選択式チップ（タグ）の統一コンポーネント
 *
 * ProfileFieldEditor のプリセット選択と AIRequestModal のプリセット選択で
 * 共通の見た目・レイアウトを提供する。
 * グリッドベースで整列表示し、選択状態をテーマカラーで切り替える。
 */

import { useAnimationTheme } from "../animations/useAnimationTheme.js";

export interface ChipItem {
  /** チップの一意キー */
  key: string;
  /** 表示ラベル */
  label: string;
  /** ツールチップ（任意） */
  title?: string;
}

interface Props {
  /** 表示するチップの一覧 */
  items: readonly ChipItem[];
  /** 現在選択中のキー（単一選択なら string | null、複数選択なら string[]） */
  selected: string | string[] | null;
  /** チップがクリックされた時のコールバック */
  onSelect: (key: string) => void;
}

/**
 * 整列されたチップグループを描画する。
 * auto-fill グリッドで均等幅に並べ、行ごとに揃った見た目を実現する。
 */
export function ChipGroup({ items, selected, onSelect }: Props) {
  const theme = useAnimationTheme();

  const isSelected = (key: string): boolean => {
    if (selected === null) return false;
    if (typeof selected === "string") return selected === key;
    return selected.includes(key);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          title={item.title}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition whitespace-nowrap ${
            isSelected(item.key)
              ? theme.colors.chipSelected
              : theme.colors.chipDefault
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
