/**
 * AzureOpenAIQuizGenerator のユニットテスト
 *
 * OpenAI SDK をモックし、function call レスポンスの抽出・バリデーション・
 * 変換ロジックを検証する。実際の API 呼び出しは行わない。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Question } from "@self-intro-quiz/shared";
import { AI_MAX_RETRIES, DEFAULT_PROFILE_FIELDS } from "@self-intro-quiz/shared";
import type { QuizCountConfig } from "@self-intro-quiz/shared";
import type { ParticipantProfile } from "../domain/quiz/QuizGenerator.js";

// ============================================================
// OpenAI SDK のモック
// ============================================================

const mockCreate = vi.fn();

vi.mock("openai", () => {
    return {
        AzureOpenAI: class MockAzureOpenAI {
            chat = { completions: { create: mockCreate } };
            constructor() {
                // パラメータ不要
            }
        },
    };
});

vi.mock("../utils/logger.js", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

import { AzureOpenAIQuizGenerator } from "./AzureOpenAIQuizGenerator.js";

/** テスト用の固定 QuizCountConfig */
const TEST_QUIZ_CONFIG: QuizCountConfig = { totalQuestions: 10, yesNoCount: 4, fourChoiceCount: 6 };

// ============================================================
// テストヘルパー
// ============================================================

function createTestParticipants(): ParticipantProfile[] {
    return [
        {
            id: "p1",
            nickname: "Alice",
            profile: {
                hometown: "東京",
                hobbies: "読書",
                skills: "プログラミング",
                favorite_food: "寿司",
                surprising_fact: "猫を5匹飼っている",
                free_text: "よろしくお願いします",
            },
        },
        {
            id: "p2",
            nickname: "Bob",
            profile: {
                hometown: "大阪",
                hobbies: "サッカー",
                skills: "料理",
                favorite_food: "たこ焼き",
                surprising_fact: "富士山に3回登った",
                free_text: "",
            },
        },
        {
            id: "p3",
            nickname: "Charlie",
            profile: {
                hometown: "名古屋",
                hobbies: "映画鑑賞",
                skills: "ピアノ",
                favorite_food: "味噌カツ",
                surprising_fact: "10カ国語を話せる",
                free_text: "はじめまして！",
            },
        },
    ];
}

function createValidAIOutput(participants: ParticipantProfile[]) {
    const names = participants.map((p) => p.nickname);
    return {
        questions: Array.from({ length: 10 }, (_, i) => ({
            questionType: i < 6 ? "four-choice" : "yes-no",
            questionText: `テスト問題${i + 1}`,
            choices: i < 6 ? names.slice(0, 4) : ["⭕ はい", "❌ いいえ"],
            correctIndex: i < 6 ? i % names.length : i % 2,
            explanation: `解説${i + 1}`,
            subjectNickname: names[i % names.length]!,
        })),
    };
}

/** OpenAI function call レスポンスを生成 */
function createFunctionCallResponse(input: unknown) {
    return {
        id: "chatcmpl-test",
        object: "chat.completion",
        model: "gpt-5.4",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: null,
                    tool_calls: [
                        {
                            id: "call_test",
                            type: "function",
                            function: {
                                name: "generate_quiz",
                                arguments: JSON.stringify(input),
                            },
                        },
                    ],
                },
                finish_reason: "tool_calls",
            },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 500, total_tokens: 600 },
    };
}

/** テキストのみのレスポンス（function call なし） */
function createTextOnlyResponse(text: string) {
    return {
        id: "chatcmpl-test",
        object: "chat.completion",
        model: "gpt-5.4",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: text,
                    tool_calls: undefined,
                },
                finish_reason: "stop",
            },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 500, total_tokens: 600 },
    };
}

// ============================================================
// テスト
// ============================================================

describe("AzureOpenAIQuizGenerator", () => {
    let generator: AzureOpenAIQuizGenerator;
    let participants: ParticipantProfile[];

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(AzureOpenAIQuizGenerator.prototype as never, "sleep").mockResolvedValue(undefined);
        generator = new AzureOpenAIQuizGenerator("https://test.openai.azure.com", "test-key", "gpt-54");
        participants = createTestParticipants();
    });

    describe("generate — 正常系", () => {
        it("function call レスポンスから Question[] を正しく変換する", async () => {
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(aiOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions).toHaveLength(10);
            questions.forEach((q: Question, i: number) => {
                expect(q.index).toBe(i);
                expect(q.text).toBe(`テスト問題${i + 1}`);
                expect(q.explanation).toBe(`解説${i + 1}`);
                expect(["p1", "p2", "p3"]).toContain(q.subjectId);

                if (i < 6) {
                    expect(q.questionType).toBe("four-choice");
                    expect(q.choices).toEqual(participants.map((p) => p.nickname));
                } else {
                    expect(q.questionType).toBe("yes-no");
                    expect(q.choices).toEqual(["⭕ はい", "❌ いいえ"]);
                }
            });
        });

        it("API に tools と tool_choice パラメータを渡している", async () => {
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(aiOutput));

            await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(mockCreate).toHaveBeenCalledOnce();
            const callArgs = mockCreate.mock.calls[0]![0];
            expect(callArgs.tools).toBeDefined();
            expect(callArgs.tools).toHaveLength(1);
            expect(callArgs.tools[0].function.name).toBe("generate_quiz");
            expect(callArgs.tool_choice).toEqual({ type: "function", function: { name: "generate_quiz" } });
        });

        it("subjectNickname が不明な場合、最初の参加者にフォールバックする", async () => {
            const aiOutput = createValidAIOutput(participants);
            aiOutput.questions[0]!.subjectNickname = "存在しない名前";
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(aiOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions[0]!.subjectId).toBe("p1");
        });
    });

    describe("generate — 異常系", () => {
        it("function call がない場合、リトライしてエラーをスローする", async () => {
            const textResponse = createTextOnlyResponse("これはテキストです");
            mockCreate.mockResolvedValue(textResponse);

            await expect(generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG)).rejects.toThrow(
                /Quiz generation failed after/,
            );
            expect(mockCreate).toHaveBeenCalledTimes(AI_MAX_RETRIES);
        });

        it("Zod バリデーション失敗時にリトライする", async () => {
            const invalidOutput = { questions: [] };
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(invalidOutput));

            const validOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(validOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions).toHaveLength(10);
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });

        it("API エラー時にリトライする", async () => {
            mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

            const validOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createFunctionCallResponse(validOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions).toHaveLength(10);
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });

        it("全リトライ失敗後、最後のエラーメッセージを含む Error をスローする", async () => {
            mockCreate.mockRejectedValue(new Error("Persistent API error"));

            await expect(generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG)).rejects.toThrow(
                /Persistent API error/,
            );
            expect(mockCreate).toHaveBeenCalledTimes(AI_MAX_RETRIES);
        });
    });
});
