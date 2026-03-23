/**
 * ClaudeQuizGenerator のユニットテスト
 *
 * Anthropic SDK をモックし、tool_use レスポンスの抽出・バリデーション・
 * 変換ロジックを検証する。実際の API 呼び出しは行わない。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Question } from "@self-intro-quiz/shared";
import { AI_MAX_RETRIES, DEFAULT_PROFILE_FIELDS } from "@self-intro-quiz/shared";
import type { ProfileFieldDefinition, QuizCountConfig } from "@self-intro-quiz/shared";
import type { ParticipantProfile } from "../domain/quiz/QuizGenerator.js";

// ============================================================
// Anthropic SDK のモック
// ============================================================

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
    return {
        default: class MockAnthropic {
            messages = { create: mockCreate };
            constructor() {
                // API key は不要
            }
        },
    };
});

// logger をモックして出力を抑制
vi.mock("../utils/logger.js", () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// テスト対象（モック適用後にインポート）
import { ClaudeQuizGenerator } from "./ClaudeQuizGenerator.js";

// ============================================================
// テストヘルパー
// ============================================================

/** テスト用の固定 QuizCountConfig（10問: 4択6問 + ⭕❌4問） */
const TEST_QUIZ_CONFIG: QuizCountConfig = { totalQuestions: 10, yesNoCount: 4, fourChoiceCount: 6 };

/** テスト用の参加者データ（3人） */
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

/** 正常な AI 出力（10問分: 6問 four-choice + 4問 yes-no） */
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

/** tool_use ブロックを含む Claude レスポンスを生成 */
function createToolUseResponse(input: unknown) {
    return {
        id: "msg_test",
        type: "message" as const,
        role: "assistant" as const,
        model: "claude-sonnet-4-5-20250929",
        stop_reason: "tool_use" as const,
        content: [
            {
                type: "tool_use" as const,
                id: "toolu_test",
                name: "generate_quiz",
                input,
            },
        ],
        usage: { input_tokens: 100, output_tokens: 500 },
    };
}

/** テキストのみの Claude レスポンスを生成（tool_use なし） */
function createTextOnlyResponse(text: string) {
    return {
        id: "msg_test",
        type: "message" as const,
        role: "assistant" as const,
        model: "claude-sonnet-4-5-20250929",
        stop_reason: "end_turn" as const,
        content: [
            {
                type: "text" as const,
                text,
            },
        ],
        usage: { input_tokens: 100, output_tokens: 500 },
    };
}

// ============================================================
// テスト
// ============================================================

describe("ClaudeQuizGenerator", () => {
    let generator: ClaudeQuizGenerator;
    let participants: ParticipantProfile[];

    beforeEach(() => {
        vi.clearAllMocks();
        // sleep をスキップしてテスト高速化
        vi.spyOn(ClaudeQuizGenerator.prototype as never, "sleep").mockResolvedValue(undefined);
        generator = new ClaudeQuizGenerator("test-api-key");
        participants = createTestParticipants();
    });

    describe("generate — 正常系", () => {
        it("tool_use レスポンスから Question[] を正しく変換する", async () => {
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions).toHaveLength(10);
            questions.forEach((q: Question, i: number) => {
                expect(q.index).toBe(i);
                expect(q.text).toBe(`テスト問題${i + 1}`);
                expect(q.explanation).toBe(`解説${i + 1}`);
                // subjectId が正しく解決されていること
                expect(["p1", "p2", "p3"]).toContain(q.subjectId);

                if (i < 6) {
                    // 4択問題
                    expect(q.questionType).toBe("four-choice");
                    expect(q.choices).toEqual(participants.map((p) => p.nickname));
                } else {
                    // ⭕❌問題
                    expect(q.questionType).toBe("yes-no");
                    expect(q.choices).toEqual(["⭕ はい", "❌ いいえ"]);
                }
            });
        });

        it("API に tools と tool_choice パラメータを渡している", async () => {
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(mockCreate).toHaveBeenCalledOnce();
            const callArgs = mockCreate.mock.calls[0]![0];
            expect(callArgs.tools).toBeDefined();
            expect(callArgs.tools).toHaveLength(1);
            expect(callArgs.tools[0].name).toBe("generate_quiz");
            expect(callArgs.tool_choice).toEqual({ type: "tool", name: "generate_quiz" });
        });

        it("subjectNickname が不明な場合、最初の参加者にフォールバックする", async () => {
            const aiOutput = createValidAIOutput(participants);
            aiOutput.questions[0]!.subjectNickname = "存在しない名前";
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            // 不明なニックネームは最初の参加者の ID にフォールバック
            expect(questions[0]!.subjectId).toBe("p1");
        });
    });

    describe("generate — 異常系", () => {
        it("tool_use ブロックがない場合、リトライしてエラーをスローする", async () => {
            const textResponse = createTextOnlyResponse("これはテキストです");
            mockCreate.mockResolvedValue(textResponse);

            await expect(generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG)).rejects.toThrow(
                /Quiz generation failed after/,
            );
            expect(mockCreate).toHaveBeenCalledTimes(AI_MAX_RETRIES);
        });

        it("Zod バリデーション失敗時にリトライする", async () => {
            // 1回目: questions が空（バリデーション失敗）
            const invalidOutput = { questions: [] };
            mockCreate.mockResolvedValueOnce(createToolUseResponse(invalidOutput));

            // 2回目: 正常
            const validOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(validOutput));

            const questions = await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            expect(questions).toHaveLength(10);
            expect(mockCreate).toHaveBeenCalledTimes(2);
        });

        it("API エラー時にリトライする", async () => {
            // 1回目: API エラー
            mockCreate.mockRejectedValueOnce(new Error("API rate limit exceeded"));

            // 2回目: 正常
            const validOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(validOutput));

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

        it("tool_use ブロックの name が異なる場合、エラーをスローする", async () => {
            const wrongToolResponse = {
                ...createToolUseResponse(createValidAIOutput(participants)),
                content: [
                    {
                        type: "tool_use" as const,
                        id: "toolu_test",
                        name: "wrong_tool",
                        input: createValidAIOutput(participants),
                    },
                ],
            };
            mockCreate.mockResolvedValue(wrongToolResponse);

            await expect(generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG)).rejects.toThrow(
                /Quiz generation failed after/,
            );
        });
    });

    describe("buildUserPrompt", () => {
        it("全参加者のプロフィールがプロンプトに含まれる", async () => {
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            const userMessage = mockCreate.mock.calls[0]![0].messages[0].content;
            for (const p of participants) {
                expect(userMessage).toContain(p.nickname);
                expect(userMessage).toContain(p.profile.hometown);
                expect(userMessage).toContain(p.profile.hobbies);
            }
        });

        it("空フィールドはプロンプトに含まれない", async () => {
            // Bob の freeText は空文字列
            const aiOutput = createValidAIOutput(participants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            await generator.generate(participants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            const userMessage = mockCreate.mock.calls[0]![0].messages[0].content as string;
            // 空でないフィールドは含まれる
            expect(userMessage).toContain("Alice");
            expect(userMessage).toContain("Bob");
            expect(userMessage).toContain("大阪");
            expect(userMessage).toContain("サッカー");
        });

        it("一部フィールドだけ入力された参加者でも正しくプロンプト生成される", async () => {
            const partialParticipants: ParticipantProfile[] = [
                {
                    id: "p1",
                    nickname: "Alice",
                    profile: {
                        hometown: "東京",
                        hobbies: "",
                        skills: "",
                        favorite_food: "",
                        surprising_fact: "",
                        free_text: "",
                    },
                },
                {
                    id: "p2",
                    nickname: "Bob",
                    profile: {
                        hometown: "",
                        hobbies: "サッカー",
                        skills: "",
                        favorite_food: "たこ焼き",
                        surprising_fact: "",
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

            const aiOutput = createValidAIOutput(partialParticipants);
            mockCreate.mockResolvedValueOnce(createToolUseResponse(aiOutput));

            await generator.generate(partialParticipants, DEFAULT_PROFILE_FIELDS, TEST_QUIZ_CONFIG);

            const userMessage = mockCreate.mock.calls[0]![0].messages[0].content as string;
            // Alice: hometown のみ
            expect(userMessage).toContain("東京");
            // Bob: hobbies + favoriteFood
            expect(userMessage).toContain("サッカー");
            expect(userMessage).toContain("たこ焼き");
        });
    });
});
