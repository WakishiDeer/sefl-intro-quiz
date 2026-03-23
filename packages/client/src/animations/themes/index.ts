/**
 * animations/themes/index.ts — テーマ定義のバレルエクスポートとルックアップ
 */

import type { AnimationThemeName } from "@self-intro-quiz/shared";
import type { AnimationThemeConfig } from "../types.js";
import { subtleTheme } from "./subtle.js";
import { funTheme } from "./fun.js";
import { cyberTheme } from "./cyber.js";
import { partyTheme } from "./party.js";
import { sakuraTheme } from "./sakura.js";

/** テーマ名 → テーマ設定のマッピング */
const themeMap: Record<AnimationThemeName, AnimationThemeConfig> = {
    subtle: subtleTheme,
    fun: funTheme,
    cyber: cyberTheme,
    party: partyTheme,
    sakura: sakuraTheme,
};

/**
 * テーマ名から AnimationThemeConfig を取得する。
 * 不明なテーマ名の場合は subtle（デフォルト）にフォールバック。
 */
export function getThemeConfig(name: AnimationThemeName): AnimationThemeConfig {
    return themeMap[name] ?? subtleTheme;
}

export { subtleTheme, funTheme, cyberTheme, partyTheme, sakuraTheme };
