/**
 * StubProfileFieldSuggester のユニットテスト
 *
 * AI 不使用のスタブが正しい形式のプロフィール項目を返すことを検証する。
 */

import { describe, it, expect } from "vitest";
import { StubProfileFieldSuggester } from "./StubProfileFieldSuggester.js";
import { DEFAULT_PROFILE_FIELDS } from "@self-intro-quiz/shared";
import type { AIRequestInput } from "../domain/room/ProfileFieldSuggester.js";

describe("StubProfileFieldSuggester", () => {
    const suggester = new StubProfileFieldSuggester();

    describe("suggest", () => {
        it("プロフィール項目を返す", async () => {
            const requests: AIRequestInput[] = [
                { presets: ["趣味に関する項目を増やして"], freeText: "" },
            ];
            const result = await suggester.suggest(requests, DEFAULT_PROFILE_FIELDS);

            expect(result.length).toBeGreaterThan(0);
            expect(result.length).toBeLessThanOrEqual(10);
        });

        it("各項目に id, label, placeholder がある", async () => {
            const requests: AIRequestInput[] = [
                { presets: [], freeText: "テスト" },
            ];
            const result = await suggester.suggest(requests, DEFAULT_PROFILE_FIELDS);

            result.forEach((field) => {
                expect(field.id).toBeTruthy();
                expect(field.label).toBeTruthy();
                expect(field.placeholder).toBeTruthy();
            });
        });

        it("現在のフィールドと異なる項目を優先的に返す", async () => {
            const currentFields = DEFAULT_PROFILE_FIELDS.slice(0, 2); // hometown, hobbies のみ
            const requests: AIRequestInput[] = [
                { presets: [], freeText: "" },
            ];
            const result = await suggester.suggest(requests, currentFields);

            // 最初の項目は currentFields に含まれない新しい項目であるべき
            const currentIds = new Set(currentFields.map((f) => f.id));
            const newFields = result.filter((f) => !currentIds.has(f.id));
            expect(newFields.length).toBeGreaterThan(0);
        });

        it("最大6項目を返す", async () => {
            const requests: AIRequestInput[] = [
                { presets: [], freeText: "" },
            ];
            const result = await suggester.suggest(requests, []);

            expect(result.length).toBeLessThanOrEqual(6);
        });
    });
});
