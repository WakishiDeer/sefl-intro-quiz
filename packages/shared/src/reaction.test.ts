/**
 * reaction.test.ts — リアクション定数のユニットテスト
 *
 * デフォルトリアクションとテーマリアクションの ID 一意性やフォーマットを検証する。
 */

import { describe, it, expect } from "vitest";
import {
    DEFAULT_EMOJI_REACTIONS,
    DEFAULT_TEXT_REACTIONS,
    THEME_REACTIONS,
    ANIMATION_THEMES,
} from "./constants.js";

describe("リアクション定数", () => {
    it("デフォルト絵文字リアクションが空でない", () => {
        expect(DEFAULT_EMOJI_REACTIONS.length).toBeGreaterThan(0);
    });

    it("デフォルトテキストリアクションが空でない", () => {
        expect(DEFAULT_TEXT_REACTIONS.length).toBeGreaterThan(0);
    });

    it("全リアクション ID が一意である", () => {
        const allIds = [
            ...DEFAULT_EMOJI_REACTIONS.map((r) => r.id),
            ...DEFAULT_TEXT_REACTIONS.map((r) => r.id),
            ...Object.values(THEME_REACTIONS).flatMap((arr) => arr.map((r) => r.id)),
        ];
        const unique = new Set(allIds);
        expect(unique.size).toBe(allIds.length);
    });

    it("全テーマにテーマ固有リアクションが定義されている", () => {
        for (const themeName of ANIMATION_THEMES) {
            expect(THEME_REACTIONS[themeName]).toBeDefined();
            expect(THEME_REACTIONS[themeName]!.length).toBeGreaterThan(0);
        }
    });

    it("絵文字リアクションの type が 'emoji' である", () => {
        for (const r of DEFAULT_EMOJI_REACTIONS) {
            expect(r.type).toBe("emoji");
        }
    });

    it("テキストリアクションの type が 'text' である", () => {
        for (const r of DEFAULT_TEXT_REACTIONS) {
            expect(r.type).toBe("text");
        }
    });

    it("全リアクションが必須フィールドを持つ", () => {
        const allReactions = [
            ...DEFAULT_EMOJI_REACTIONS,
            ...DEFAULT_TEXT_REACTIONS,
            ...Object.values(THEME_REACTIONS).flat(),
        ];
        for (const r of allReactions) {
            expect(r.id).toBeTruthy();
            expect(r.display).toBeTruthy();
            expect(r.label).toBeTruthy();
            expect(["emoji", "text"]).toContain(r.type);
        }
    });
});
