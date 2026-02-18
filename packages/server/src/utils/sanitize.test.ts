/**
 * sanitize.test.ts — sanitize / sanitizeProfile のユニットテスト
 */

import { describe, it, expect } from "vitest";
import { sanitize, sanitizeProfile } from "./sanitize.js";

describe("sanitize", () => {
    it("HTML タグを除去する", () => {
        expect(sanitize("<b>bold</b>")).toBe("bold");
    });

    it("script タグを除去する", () => {
        expect(sanitize('<script>alert("xss")</script>')).toBe("");
    });

    it("前後の空白をトリムする", () => {
        expect(sanitize("  hello  ")).toBe("hello");
    });

    it("通常のテキストはそのまま返す", () => {
        expect(sanitize("Hello World")).toBe("Hello World");
    });

    it("日本語テキストを正しく処理する", () => {
        expect(sanitize("東京都<b>渋谷区</b>")).toBe("東京都渋谷区");
    });
});

describe("sanitizeProfile", () => {
    it("全フィールドをサニタイズする", () => {
        const dirty = {
            hometown: "<b>Tokyo</b>",
            hobbies: "<script>alert(1)</script>Reading",
            skills: "  TypeScript  ",
            favorite_food: "Sushi<img onerror=alert(1)>",
            surprising_fact: "I can juggle",
            free_text: "<a href='x'>link</a>",
        };

        const clean = sanitizeProfile(dirty);
        expect(clean["hometown"]).toBe("Tokyo");
        expect(clean["hobbies"]).toBe("Reading");
        expect(clean["skills"]).toBe("TypeScript");
        expect(clean["favorite_food"]).toBe("Sushi");
        expect(clean["surprising_fact"]).toBe("I can juggle");
        expect(clean["free_text"]).toBe("link");
    });

    it("動的キーのプロフィールもサニタイズする", () => {
        const dirty = {
            pet: "<b>Cat</b>",
            color: "  Blue  ",
        };
        const clean = sanitizeProfile(dirty);
        expect(clean["pet"]).toBe("Cat");
        expect(clean["color"]).toBe("Blue");
    });
});
