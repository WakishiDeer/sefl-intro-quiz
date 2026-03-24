/**
 * profileFieldPresets.test.ts — プリセットカタログのユニットテスト
 *
 * 全プリセットの構造健全性・一意性・制約遵守を検証する。
 */

import { describe, it, expect } from "vitest";
import { PROFILE_FIELD_PRESETS, getPresetById } from "./profileFieldPresets.js";
import {
    MIN_PROFILE_FIELDS,
    MAX_PROFILE_FIELDS,
    MAX_PROFILE_FIELD_LABEL_LENGTH,
    MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH,
    DEFAULT_PROFILE_FIELDS,
} from "./constants.js";

describe("PROFILE_FIELD_PRESETS", () => {
    it("プリセットが1つ以上存在する", () => {
        expect(PROFILE_FIELD_PRESETS.length).toBeGreaterThan(0);
    });

    it("全プリセットの id がユニークである", () => {
        const ids = PROFILE_FIELD_PRESETS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("先頭のプリセットが 'default' である", () => {
        expect(PROFILE_FIELD_PRESETS[0]!.id).toBe("default");
    });

    it("'default' プリセットの fields が DEFAULT_PROFILE_FIELDS と一致する", () => {
        const defaultPreset = PROFILE_FIELD_PRESETS.find((p) => p.id === "default");
        expect(defaultPreset).toBeDefined();
        expect(defaultPreset!.fields).toEqual(DEFAULT_PROFILE_FIELDS);
    });

    describe.each(PROFILE_FIELD_PRESETS.map((p) => [p.id, p] as const))(
        "プリセット '%s'",
        (_id, preset) => {
            it("必須フィールドがすべて存在する", () => {
                expect(preset.id).toBeTruthy();
                expect(preset.label).toBeTruthy();
                expect(preset.icon).toBeTruthy();
                expect(preset.description).toBeTruthy();
                expect(preset.fields).toBeDefined();
            });

            it(`fields の数が ${MIN_PROFILE_FIELDS}〜${MAX_PROFILE_FIELDS} の範囲内`, () => {
                expect(preset.fields.length).toBeGreaterThanOrEqual(MIN_PROFILE_FIELDS);
                expect(preset.fields.length).toBeLessThanOrEqual(MAX_PROFILE_FIELDS);
            });

            it("fields 内の id がユニーク", () => {
                const fieldIds = preset.fields.map((f) => f.id);
                expect(new Set(fieldIds).size).toBe(fieldIds.length);
            });

            it("fields 内の label がユニーク", () => {
                const labels = preset.fields.map((f) => f.label);
                expect(new Set(labels).size).toBe(labels.length);
            });

            it("fields の各 label が文字数制限内", () => {
                for (const field of preset.fields) {
                    expect(field.label.length).toBeLessThanOrEqual(MAX_PROFILE_FIELD_LABEL_LENGTH);
                    expect(field.label.length).toBeGreaterThan(0);
                }
            });

            it("fields の各 placeholder が文字数制限内", () => {
                for (const field of preset.fields) {
                    expect(field.placeholder.length).toBeLessThanOrEqual(MAX_PROFILE_FIELD_PLACEHOLDER_LENGTH);
                }
            });

            it("fields の各 id が空でない", () => {
                for (const field of preset.fields) {
                    expect(field.id.length).toBeGreaterThan(0);
                }
            });
        },
    );
});

describe("getPresetById", () => {
    it("存在する ID でプリセットを取得できる", () => {
        const result = getPresetById("default");
        expect(result).toBeDefined();
        expect(result!.id).toBe("default");
    });

    it("存在する ID で正しいプリセットを返す", () => {
        const result = getPresetById("drinking_party");
        expect(result).toBeDefined();
        expect(result!.label).toBe("飲み会・懇親会");
    });

    it("存在しない ID で undefined を返す", () => {
        // @ts-expect-error テスト用に無効な ID を渡す
        const result = getPresetById("nonexistent");
        expect(result).toBeUndefined();
    });
});
