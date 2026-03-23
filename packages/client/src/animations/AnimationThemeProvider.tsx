/**
 * AnimationThemeProvider — テーマを Context で配信するプロバイダ
 *
 * useRoomStore の animationTheme からテーマ Config を解決し、
 * 子コンポーネントに提供する。常時パーティクルもここでレンダリング。
 */

import { createContext, useMemo, type ReactNode } from "react";
import type { AnimationThemeConfig } from "./types.js";
import { getThemeConfig } from "./themes/index.js";
import { useRoomStore } from "../stores/useRoomStore.js";

export const AnimationThemeContext = createContext<AnimationThemeConfig | null>(null);

interface Props {
    children: ReactNode;
}

export function AnimationThemeProvider({ children }: Props) {
    const animationTheme = useRoomStore((s) => s.animationTheme);

    const themeConfig = useMemo(
        () => getThemeConfig(animationTheme),
        [animationTheme],
    );

    return (
        <AnimationThemeContext.Provider value={themeConfig}>
            <div className={themeConfig.rootClassName}>
                {/* 常時パーティクル（テーマが定義している場合） */}
                {themeConfig.effects.ambient?.()}
                {children}
            </div>
        </AnimationThemeContext.Provider>
    );
}
