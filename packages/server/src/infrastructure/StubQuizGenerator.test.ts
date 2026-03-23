/**
 * StubQuizGenerator のユニットテスト
 *
 * AI 不使用のスタブが正しい形式のクイズを返すことを検証する。
 */

import { describe, it, expect } from "vitest";
import { StubQuizGenerator } from "./StubQuizGenerator.js";
import {
    DEFAULT_PROFILE_FIELDS,
    calculateQuizCount,
} from "@self-intro-quiz/shared";
import type { QuizCountConfig } from "@self-intro-quiz/shared";
import type { ParticipantProfile } from "../domain/quiz/QuizGenerator.js";

/** テスト用の参加者データを生成する */
function createParticipants(count: number): ParticipantProfile[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `p${i + 1}`,
        nickname: `テスト太郎${i + 1}`,
        profile: {
            hometown: `都市${i + 1}`,
            hobbies: `趣味${i + 1}`,
            skills: `特技${i + 1}`,
            favorite_food: `食べ物${i + 1}`,
            surprising_fact: `事実${i + 1}`,
            free_text: `自由${i + 1}`,
        },
    }));
}

/** テスト用の固定 QuizCountConfig */
const FIXED_CONFIG: QuizCountConfig = { totalQuestions: 10, yesNoCount: 4, fourChoiceCount: 6 };

describe("StubQuizGenerator", () => {
    const generator = new StubQuizGenerator();

    describe("generate", () => {
        it("指定された問題数のクイズを生成する", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            expect(questions).toHaveLength(FIXED_CONFIG.totalQuestions);
        });

        it("4択問題と⭕❌問題が構成通りになる", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            const fourChoice = questions.filter((q) => q.questionType === "four-choice");
            const yesNo = questions.filter((q) => q.questionType === "yes-no");

            expect(fourChoice).toHaveLength(FIXED_CONFIG.fourChoiceCount);
            expect(yesNo).toHaveLength(FIXED_CONFIG.yesNoCount);
        });

        it("各問題にインデックスが連番で振られている", async () => {
            const participants = createParticipants(3);
            const config = calculateQuizCount(3, DEFAULT_PROFILE_FIELDS.length);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, config);

            questions.forEach((q, i) => {
                expect(q.index).toBe(i);
            });
        });

        it("4択問題の選択肢は4つある", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            const fourChoice = questions.filter((q) => q.questionType === "four-choice");
            fourChoice.forEach((q) => {
                expect(q.choices).toHaveLength(4);
            });
        });

        it("⭕❌問題の選択肢は2つ（⭕ はい / ❌ いいえ）", async () => {
            const participants = createParticipants(3);
            const config = calculateQuizCount(3, DEFAULT_PROFILE_FIELDS.length);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, config);

            const yesNo = questions.filter((q) => q.questionType === "yes-no");
            yesNo.forEach((q) => {
                expect(q.choices).toHaveLength(2);
                expect(q.choices[0]).toBe("⭕ はい");
                expect(q.choices[1]).toBe("❌ いいえ");
            });
        });

        it("各問題に subjectId が設定されている", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            const participantIds = new Set(participants.map((p) => p.id));
            questions.forEach((q) => {
                expect(participantIds).toContain(q.subjectId);
            });
        });

        it("correctIndex が有効な範囲内にある", async () => {
            const participants = createParticipants(5);
            const config = calculateQuizCount(5, DEFAULT_PROFILE_FIELDS.length);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, config);

            questions.forEach((q) => {
                expect(q.correctIndex).toBeGreaterThanOrEqual(0);
                expect(q.correctIndex).toBeLessThan(q.choices.length);
            });
        });

        it("各問題に問題文と解説がある", async () => {
            const participants = createParticipants(3);
            const config = calculateQuizCount(3, DEFAULT_PROFILE_FIELDS.length);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, config);

            questions.forEach((q) => {
                expect(q.text).toBeTruthy();
                expect(q.explanation).toBeTruthy();
            });
        });

        it("参加者が3人の場合でも正しくクイズ生成できる", async () => {
            const participants = createParticipants(3);
            const config = calculateQuizCount(3, DEFAULT_PROFILE_FIELDS.length);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, config);

            expect(questions).toHaveLength(config.totalQuestions);
        });

        it("4択問題に「〜は誰？」と「〜さんの◯◯はどれ？」の2パターンが混在する", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            const fourChoice = questions.filter((q) => q.questionType === "four-choice");
            const whoQuestions = fourChoice.filter((q) => q.text.includes("は誰？"));
            const aboutQuestions = fourChoice.filter((q) => q.text.includes("はどれ？"));

            // パターンA（〜は誰？）とパターンB（〜はどれ？）が両方存在する
            expect(whoQuestions.length).toBeGreaterThan(0);
            expect(aboutQuestions.length).toBeGreaterThan(0);
            expect(whoQuestions.length + aboutQuestions.length).toBe(FIXED_CONFIG.fourChoiceCount);
        });

        it("「〜さんの◯◯はどれ？」問題の選択肢にプロフィール値が含まれる", async () => {
            const participants = createParticipants(4);
            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, FIXED_CONFIG);

            const aboutQuestions = questions.filter((q) => q.text.includes("はどれ？"));
            aboutQuestions.forEach((q) => {
                // 正解の選択肢は参加者名ではなくプロフィール値
                const correctChoice = q.choices[q.correctIndex]!;
                const participantNames = participants.map((p) => p.nickname);
                expect(participantNames).not.toContain(correctChoice);
            });
        });
    });
});
