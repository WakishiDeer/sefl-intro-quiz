/**
 * validation.test.ts — Zod バリデーションスキーマのユニットテスト
 */

import { describe, it, expect } from "vitest";
import {
    NicknameSchema,
    RoomCodeSchema,
    ProfileSchema,
    CreateRoomSchema,
    JoinRoomSchema,
    SubmitAnswerSchema,
    AIQuestionSchema,
    AIOutputSchema,
} from "./validation.js";

// ============================================================
// NicknameSchema
// ============================================================

describe("NicknameSchema", () => {
    it("有効なニックネームを受け入れる", () => {
        expect(NicknameSchema.safeParse("Alice").success).toBe(true);
        expect(NicknameSchema.safeParse("太郎").success).toBe(true);
        expect(NicknameSchema.safeParse("A1").success).toBe(true);
    });

    it("短すぎるニックネームを拒否する", () => {
        expect(NicknameSchema.safeParse("A").success).toBe(false);
        expect(NicknameSchema.safeParse("").success).toBe(false);
    });

    it("長すぎるニックネームを拒否する", () => {
        expect(NicknameSchema.safeParse("A".repeat(13)).success).toBe(false);
    });

    it("空白を含むニックネームを拒否する", () => {
        expect(NicknameSchema.safeParse("A B").success).toBe(false);
    });

    it("HTML 特殊文字を含むニックネームを拒否する", () => {
        expect(NicknameSchema.safeParse("A<B").success).toBe(false);
        expect(NicknameSchema.safeParse("A>B").success).toBe(false);
        expect(NicknameSchema.safeParse("A&B").success).toBe(false);
        expect(NicknameSchema.safeParse('A"B').success).toBe(false);
    });
});

// ============================================================
// RoomCodeSchema
// ============================================================

describe("RoomCodeSchema", () => {
    it("6文字の英数大文字を受け入れる", () => {
        expect(RoomCodeSchema.safeParse("ABC123").success).toBe(true);
        expect(RoomCodeSchema.safeParse("XXXXXX").success).toBe(true);
    });

    it("長さが異なるコードを拒否する", () => {
        expect(RoomCodeSchema.safeParse("ABC12").success).toBe(false);
        expect(RoomCodeSchema.safeParse("ABC1234").success).toBe(false);
    });

    it("小文字を拒否する", () => {
        expect(RoomCodeSchema.safeParse("abcdef").success).toBe(false);
    });
});

// ============================================================
// ProfileSchema
// ============================================================

describe("ProfileSchema", () => {
    it("有効なプロフィールを受け入れる", () => {
        const result = ProfileSchema.safeParse({
            hometown: "Tokyo",
            hobbies: "Reading",
            skills: "TypeScript",
            favoriteFood: "Sushi",
            surprisingFact: "I can juggle",
            freeText: "Hello!",
        });
        expect(result.success).toBe(true);
    });

    it("空フィールドにデフォルト値を設定する", () => {
        const result = ProfileSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.hometown).toBe("");
            expect(result.data.hobbies).toBe("");
        }
    });

    it("100文字を超えるフィールドを拒否する", () => {
        const result = ProfileSchema.safeParse({
            hometown: "A".repeat(101),
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// CreateRoomSchema
// ============================================================

describe("CreateRoomSchema", () => {
    it("有効なペイロードを受け入れる", () => {
        expect(CreateRoomSchema.safeParse({ nickname: "Alice" }).success).toBe(
            true,
        );
    });

    it("nickname が無いペイロードを拒否する", () => {
        expect(CreateRoomSchema.safeParse({}).success).toBe(false);
    });
});

// ============================================================
// JoinRoomSchema
// ============================================================

describe("JoinRoomSchema", () => {
    it("有効なペイロードを受け入れる", () => {
        const result = JoinRoomSchema.safeParse({
            roomCode: "ABC123",
            nickname: "Bob",
        });
        expect(result.success).toBe(true);
    });

    it("roomCode が無いペイロードを拒否する", () => {
        expect(JoinRoomSchema.safeParse({ nickname: "Bob" }).success).toBe(false);
    });
});

// ============================================================
// SubmitAnswerSchema
// ============================================================

describe("SubmitAnswerSchema", () => {
    it("有効な回答を受け入れる", () => {
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 0, choiceIndex: 0 })
                .success,
        ).toBe(true);
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 9, choiceIndex: 3 })
                .success,
        ).toBe(true);
    });

    it("範囲外の questionIndex を拒否する", () => {
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: -1, choiceIndex: 0 })
                .success,
        ).toBe(false);
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 10, choiceIndex: 0 })
                .success,
        ).toBe(false);
    });

    it("範囲外の choiceIndex を拒否する", () => {
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 0, choiceIndex: -1 })
                .success,
        ).toBe(false);
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 0, choiceIndex: 4 })
                .success,
        ).toBe(false);
    });
});

// ============================================================
// AIQuestionSchema / AIOutputSchema
// ============================================================

describe("AIQuestionSchema", () => {
    it("有効な AI 出力問題を受け入れる", () => {
        const result = AIQuestionSchema.safeParse({
            questionText: "Who likes sushi?",
            choices: ["Alice", "Bob", "Carol", "Dave"],
            correctIndex: 0,
            explanation: "Alice mentioned sushi in her profile",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(true);
    });

    it("選択肢が不足している場合を拒否する", () => {
        const result = AIQuestionSchema.safeParse({
            questionText: "Question?",
            choices: ["A"],
            correctIndex: 0,
            explanation: "Because",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(false);
    });
});

describe("AIOutputSchema", () => {
    it("10問ちょうどの出力を受け入れる", () => {
        const questions = Array.from({ length: 10 }, (_, i) => ({
            questionText: `Q${i}?`,
            choices: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: `Because ${i}`,
            subjectNickname: `User${i}`,
        }));
        const result = AIOutputSchema.safeParse({ questions });
        expect(result.success).toBe(true);
    });

    it("10問以外を拒否する", () => {
        const questions = Array.from({ length: 5 }, (_, i) => ({
            questionText: `Q${i}?`,
            choices: ["A", "B"],
            correctIndex: 0,
            explanation: `Because ${i}`,
            subjectNickname: `User${i}`,
        }));
        const result = AIOutputSchema.safeParse({ questions });
        expect(result.success).toBe(false);
    });
});
