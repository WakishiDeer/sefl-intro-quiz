/**
 * ThemePicker — アニメーションテーマ選択コンポーネント
 *
 * Host のみがテーマを変更可能。Non-host は閲覧のみ。
 * lobby フェーズでのみ表示される想定。
 */

import { useRoomStore } from "../stores/useRoomStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { getThemeConfig } from "../animations/themes/index.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, ANIMATION_THEME_META, ANIMATION_THEMES } from "@self-intro-quiz/shared";
import type { AnimationThemeName } from "@self-intro-quiz/shared";

export function ThemePicker() {
  const isHost = useRoomStore((s) => s.isHost);
  const currentTheme = useRoomStore((s) => s.animationTheme);
  const theme = useAnimationTheme();

  const handleSelect = (theme: AnimationThemeName) => {
    if (!isHost || theme === currentTheme) return;
    socket.emit(C2S_EVENTS.ROOM_SET_THEME, { theme });
  };

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold ${theme.colors.textSecondary} uppercase tracking-wide`}>
        演出テーマ
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ANIMATION_THEMES.map((themeName) => {
          const meta = ANIMATION_THEME_META[themeName];
          const themePreview = getThemeConfig(themeName);
          const isActive = themeName === currentTheme;

          return (
            <button
              key={themeName}
              onClick={() => handleSelect(themeName)}
              disabled={!isHost}
              className={[
                "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-all duration-300",
                isActive
                  ? `${themePreview.colors.cardBorder} bg-gradient-to-br ${themePreview.colors.bgGradient} ring-2 ring-offset-1`
                  : isHost
                    ? `${theme.colors.cardBorder} ${theme.colors.surfaceMuted} hover:opacity-80`
                    : `${theme.colors.cardBorder} ${theme.colors.surfaceMuted} cursor-default`,
                !isHost && "opacity-70",
              ].join(" ")}
            >
              <span className="text-2xl">{meta.icon}</span>
              <span className={`text-xs font-semibold ${isActive ? themePreview.colors.textPrimary : theme.colors.textPrimary}`}>{meta.label}</span>
              <span className={`text-[10px] leading-tight ${isActive ? themePreview.colors.textSecondary : theme.colors.textSecondary}`}>{meta.description}</span>
            </button>
          );
        })}
      </div>
      {!isHost && (
        <p className={`text-xs ${theme.colors.textSecondary}`}>テーマの変更はホストのみ可能です</p>
      )}
    </div>
  );
}
