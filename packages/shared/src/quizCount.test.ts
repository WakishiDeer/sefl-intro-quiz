/**
 * quizCount.test.ts — calculateQuizCount のユニットテスト
 *
 * 参加者数・プロフィール項目数に応じた動的クイズ問題数の計算を検証する。
 */

import { describe, it, expect } from "vitest";
import { calculateQuizCount } from "./quizCount.js";
import { MIN_QUESTIONS, MAX_QUESTIONS, YES_NO_RATIO } from "./constants.js";

describe("calculateQuizCount", () => {
    // ----------------------------------------------------------
    // 基本的な計算
    // ----------------------------------------------------------

    describe("基本的な計算", () => {
        it("参加者3人・フィールド6個の場合、7問になる", () => {
            // base = 3 * 2 = 6, fieldBonus = floor((6-3)/2) = 1, total = 7
            const result = calculateQuizCount(3, 6);
            expect(result.totalQuestions).toBe(7);
        });

        it("参加者5人・フィールド6個の場合、11問になる", () => {
            // base = 5 * 2 = 10, fieldBonus = 1, total = 11
            const result = calculateQuizCount(5, 6);
            expect(result.totalQuestions).toBe(11);
        });

        it("参加者3人・フィールド1個の場合、最小 MIN_QUESTIONS になる", () => {
            // base = 3 * 2 = 6, fieldBonus = max(0, floor((1-3)/2)) = 0, total = 6
            const result = calculateQuizCount(3, 1);
            expect(result.totalQuestions).toBe(6);
        });

        it("参加者3人・フィールド3個の場合、fieldBonus は 0", () => {
            // base = 6, fieldBonus = 0, total = 6
            const result = calculateQuizCount(3, 3);
            expect(result.totalQuestions).toBe(6);
        });

        it("参加者3人・フィールド10個の場合、fieldBonus は 3", () => {
            // base = 6, fieldBonus = floor((10-3)/2) = 3, total = 9
            const result = calculateQuizCount(3, 10);
            expect(result.totalQuestions).toBe(9);
        });
    });

    // ----------------------------------------------------------
    // クランプ（最小・最大）
    // ----------------------------------------------------------

    describe("クランプ処理", () => {
        it("参加者2人でも MIN_QUESTIONS 以上になる", () => {
            // base = 2 * 2 = 4 → clamp to MIN_QUESTIONS
            const result = calculateQuizCount(2, 1);
            expect(result.totalQuestions).toBe(MIN_QUESTIONS);
        });

        it("参加者1人でも MIN_QUESTIONS になる", () => {
            const result = calculateQuizCount(1, 1);
            expect(result.totalQuestions).toBe(MIN_QUESTIONS);
        });

        it("参加者20人の場合、MAX_QUESTIONS を超えない", () => {
            // base = 20 * 2 = 40 → clamp to MAX_QUESTIONS
            const result = calculateQuizCount(20, 10);
            expect(result.totalQuestions).toBe(MAX_QUESTIONS);
        });

        it("参加者10人・フィールド6個の場合、MAX_QUESTIONS = 20 になる", () => {
            // base = 10 * 2 = 20, fieldBonus = 1 → 21 → clamp to 20
            const result = calculateQuizCount(10, 6);
            expect(result.totalQuestions).toBe(MAX_QUESTIONS);
        });
    });

    // ----------------------------------------------------------
    // ⭕❌問題と4択問題の比率
    // ----------------------------------------------------------

    describe("問題タイプの比率", () => {
        it("yesNoCount と fourChoiceCount の合計が totalQuestions に等しい", () => {
            for (const [participants, fields] of [[3, 3], [5, 6], [10, 6], [20, 10], [2, 1]]) {
                const result = calculateQuizCount(participants!, fields!);
                expect(result.yesNoCount + result.fourChoiceCount).toBe(result.totalQuestions);
            }
        });

        it("yesNoCount は最低1問以上ある", () => {
            const result = calculateQuizCount(2, 1);
            expect(result.yesNoCount).toBeGreaterThanOrEqual(1);
        });

        it("yesNoCount は totalQuestions * YES_NO_RATIO に概ね近い", () => {
            const result = calculateQuizCount(5, 6);
            const expectedYesNo = Math.round(result.totalQuestions * YES_NO_RATIO);
            expect(result.yesNoCount).toBe(expectedYesNo);
        });

        it("fourChoiceCount は totalQuestions - yesNoCount", () => {
            const result = calculateQuizCount(7, 5);
            expect(result.fourChoiceCount).toBe(result.totalQuestions - result.yesNoCount);
        });
    });

    // ----------------------------------------------------------
    // 境界値テスト
    // ----------------------------------------------------------

    describe("境界値", () => {
        it("参加者0人の場合、MIN_QUESTIONS になる", () => {
            const result = calculateQuizCount(0, 6);
            expect(result.totalQuestions).toBe(MIN_QUESTIONS);
        });

        it("フィールド0個の場合、fieldBonus は 0", () => {
            const result = calculateQuizCount(5, 0);
            // base = 10, fieldBonus = max(0, floor((0-3)/2)) = 0 → 10
            expect(result.totalQuestions).toBe(10);
        });

        it("ちょうど MIN_QUESTIONS になるケース（参加者2人・フィールド3個）", () => {
            // base = 4, fieldBonus = 0 → 4 → clamp to MIN_QUESTIONS = 5
            const result = calculateQuizCount(2, 3);
            expect(result.totalQuestions).toBe(MIN_QUESTIONS);
        });

        it("ちょうど MAX_QUESTIONS になるケース（参加者10人・フィールド3個）", () => {
            // base = 20, fieldBonus = 0 → 20 = MAX_QUESTIONS
            const result = calculateQuizCount(10, 3);
            expect(result.totalQuestions).toBe(MAX_QUESTIONS);
        });
    });

    // ----------------------------------------------------------
    // 返り値の構造
    // ----------------------------------------------------------

    describe("返り値の構造", () => {
        it("QuizCountConfig の全プロパティが含まれる", () => {
            const result = calculateQuizCount(5, 6);
            expect(result).toHaveProperty("totalQuestions");
            expect(result).toHaveProperty("yesNoCount");
            expect(result).toHaveProperty("fourChoiceCount");
        });

        it("全プロパティが正の整数", () => {
            const result = calculateQuizCount(4, 4);
            expect(Number.isInteger(result.totalQuestions)).toBe(true);
            expect(Number.isInteger(result.yesNoCount)).toBe(true);
            expect(Number.isInteger(result.fourChoiceCount)).toBe(true);
            expect(result.totalQuestions).toBeGreaterThan(0);
            expect(result.yesNoCount).toBeGreaterThan(0);
            expect(result.fourChoiceCount).toBeGreaterThan(0);
        });
    });
});
