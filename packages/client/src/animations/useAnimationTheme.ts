/**
 * useAnimationTheme — 現在のアニメーションテーマを取得するフック
 */

import { useContext } from "react";
import { AnimationThemeContext } from "./AnimationThemeProvider.js";
import type { AnimationThemeConfig } from "./types.js";
import { subtleTheme } from "./themes/subtle.js";

/**
 * 現在のアニメーションテーマ Config を返す。
 * Provider 外で呼ばれた場合は subtle テーマにフォールバック。
 */
export function useAnimationTheme(): AnimationThemeConfig {
    const ctx = useContext(AnimationThemeContext);
    return ctx ?? subtleTheme;
}
