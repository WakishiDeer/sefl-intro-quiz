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
    AIOutputJsonSchema,
    ProfileFieldDefinitionSchema,
    createProfileSchema,
    UpdateFieldsSchema,
    AIRequestSubmitSchema,
    AIRequestAdoptSchema,
    createAIOutputSchema,
    SetThemeSchema,
    SendInviteSchema,
    SendReactionSchema,
    KickParticipantSchema,
} from "./validation.js";
import { DEFAULT_PROFILE_FIELDS, MAX_PROFILE_FIELDS, INVITE_MAX_MESSAGE_LENGTH, REACTION_ID_MAX_LENGTH } from "./constants.js";
import type { ProfileFieldDefinition } from "./types/profile.js";

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

    it("1フィールドだけ入力されていれば受け入れる", () => {
        const result = ProfileSchema.safeParse({
            hometown: "Tokyo",
        });
        expect(result.success).toBe(true);
    });

    it("全フィールド空（デフォルト値のみ）を拒否する", () => {
        const result = ProfileSchema.safeParse({});
        expect(result.success).toBe(false);
    });

    it("全フィールド空白のみを拒否する", () => {
        const result = ProfileSchema.safeParse({
            hometown: "   ",
            hobbies: "  ",
            skills: "",
            favoriteFood: "",
            surprisingFact: "",
            freeText: "",
        });
        expect(result.success).toBe(false);
    });

    it("100文字を超えるフィールドを拒否する", () => {
        const result = ProfileSchema.safeParse({
            hometown: "A".repeat(101),
        });
        expect(result.success).toBe(false);
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

    it("clientId を含むペイロードを受け入れる", () => {
        const result = JoinRoomSchema.safeParse({
            roomCode: "ABC123",
            nickname: "Bob",
            clientId: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
    });

    it("clientId を省略したペイロードを受け入れる（後方互換）", () => {
        const result = JoinRoomSchema.safeParse({
            roomCode: "ABC123",
            nickname: "Bob",
        });
        expect(result.success).toBe(true);
    });

    it("不正な clientId を拒否する（UUID 形式でない）", () => {
        const result = JoinRoomSchema.safeParse({
            roomCode: "ABC123",
            nickname: "Bob",
            clientId: "not-a-uuid",
        });
        expect(result.success).toBe(false);
    });

    it("roomCode が無いペイロードを拒否する", () => {
        expect(JoinRoomSchema.safeParse({ nickname: "Bob" }).success).toBe(false);
    });
});

// ============================================================
// CreateRoomSchema（clientId）
// ============================================================

describe("CreateRoomSchema", () => {
    it("有効なペイロードを受け入れる", () => {
        expect(CreateRoomSchema.safeParse({ nickname: "Alice" }).success).toBe(
            true,
        );
    });

    it("clientId を含むペイロードを受け入れる", () => {
        const result = CreateRoomSchema.safeParse({
            nickname: "Alice",
            clientId: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
    });

    it("不正な clientId を拒否する", () => {
        const result = CreateRoomSchema.safeParse({
            nickname: "Alice",
            clientId: "invalid",
        });
        expect(result.success).toBe(false);
    });

    it("nickname が無いペイロードを拒否する", () => {
        expect(CreateRoomSchema.safeParse({}).success).toBe(false);
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
        // MAX_QUESTIONS - 1 まで許容される
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 19, choiceIndex: 0 })
                .success,
        ).toBe(true);
    });

    it("範囲外の questionIndex を拒否する", () => {
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: -1, choiceIndex: 0 })
                .success,
        ).toBe(false);
        // MAX_QUESTIONS (20) は範囲外
        expect(
            SubmitAnswerSchema.safeParse({ questionIndex: 20, choiceIndex: 0 })
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
    it("有効な AI 出力問題を受け入れる（4択）", () => {
        const result = AIQuestionSchema.safeParse({
            questionType: "four-choice",
            questionText: "Who likes sushi?",
            choices: ["Alice", "Bob", "Carol", "Dave"],
            correctIndex: 0,
            explanation: "Alice mentioned sushi in her profile",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(true);
    });

    it("有効な AI 出力問題を受け入れる（⭕❌）", () => {
        const result = AIQuestionSchema.safeParse({
            questionType: "yes-no",
            questionText: "Aliceさんの出身地は東京である。⭕か❌か？",
            choices: ["⭕ はい", "❌ いいえ"],
            correctIndex: 0,
            explanation: "Aliceさんの出身地は東京です",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(true);
    });

    it("選択肢が不足している場合を拒否する", () => {
        const result = AIQuestionSchema.safeParse({
            questionType: "four-choice",
            questionText: "Question?",
            choices: ["A"],
            correctIndex: 0,
            explanation: "Because",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(false);
    });

    it("questionType がない場合を拒否する", () => {
        const result = AIQuestionSchema.safeParse({
            questionText: "Question?",
            choices: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "Because",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(false);
    });

    it("不正な questionType を拒否する", () => {
        const result = AIQuestionSchema.safeParse({
            questionType: "multiple",
            questionText: "Question?",
            choices: ["A", "B", "C", "D"],
            correctIndex: 0,
            explanation: "Because",
            subjectNickname: "Alice",
        });
        expect(result.success).toBe(false);
    });
});

describe("AIOutputJsonSchema", () => {
    it("トップレベルに type: 'object' が存在する（AI API 必須）", () => {
        expect(AIOutputJsonSchema).toHaveProperty("type", "object");
    });

    it("トップレベルに properties が存在する", () => {
        expect(AIOutputJsonSchema).toHaveProperty("properties");
    });

    it("$schema キーが除去されている", () => {
        expect(AIOutputJsonSchema).not.toHaveProperty("$schema");
    });

    it("definitions ラッパーが存在しない（フラットスキーマ）", () => {
        expect(AIOutputJsonSchema).not.toHaveProperty("definitions");
    });
});

describe("AIOutputSchema", () => {
    it("5問以上20問以下の出力を受け入れる", () => {
        for (const count of [5, 10, 15, 20]) {
            const questions = Array.from({ length: count }, (_, i) => ({
                questionType: i < 6 ? "four-choice" : "yes-no",
                questionText: `Q${i}?`,
                choices: i < 6 ? ["A", "B", "C", "D"] : ["⭕ はい", "❌ いいえ"],
                correctIndex: 0,
                explanation: `Because ${i}`,
                subjectNickname: `User${i}`,
            }));
            const result = AIOutputSchema.safeParse({ questions });
            expect(result.success).toBe(true);
        }
    });

    it("4問以下または21問以上を拒否する", () => {
        for (const count of [4, 21]) {
            const questions = Array.from({ length: count }, (_, i) => ({
                questionType: "four-choice",
                questionText: `Q${i}?`,
                choices: ["A", "B", "C", "D"],
                correctIndex: 0,
                explanation: `Because ${i}`,
                subjectNickname: `User${i}`,
            }));
            const result = AIOutputSchema.safeParse({ questions });
            expect(result.success).toBe(false);
        }
    });
});

describe("createAIOutputSchema", () => {
    function makeQuestions(count: number) {
        return Array.from({ length: count }, (_, i) => ({
            questionType: i % 2 === 0 ? "four-choice" : "yes-no",
            questionText: `Q${i}?`,
            choices: i % 2 === 0 ? ["A", "B", "C", "D"] : ["⭕ はい", "❌ いいえ"],
            correctIndex: 0,
            explanation: `Because ${i}`,
            subjectNickname: `User${i}`,
        }));
    }

    it("指定された問題数ちょうどを受け入れる", () => {
        const schema = createAIOutputSchema(7);
        const result = schema.safeParse({ questions: makeQuestions(7) });
        expect(result.success).toBe(true);
    });

    it("指定された問題数と異なる場合を拒否する", () => {
        const schema = createAIOutputSchema(7);
        expect(schema.safeParse({ questions: makeQuestions(6) }).success).toBe(false);
        expect(schema.safeParse({ questions: makeQuestions(8) }).success).toBe(false);
    });

    it("5問のスキーマが正しく動作する", () => {
        const schema = createAIOutputSchema(5);
        expect(schema.safeParse({ questions: makeQuestions(5) }).success).toBe(true);
        expect(schema.safeParse({ questions: makeQuestions(10) }).success).toBe(false);
    });

    it("20問のスキーマが正しく動作する", () => {
        const schema = createAIOutputSchema(20);
        expect(schema.safeParse({ questions: makeQuestions(20) }).success).toBe(true);
        expect(schema.safeParse({ questions: makeQuestions(19) }).success).toBe(false);
    });
});

// ============================================================
// ProfileFieldDefinitionSchema
// ============================================================

describe("ProfileFieldDefinitionSchema", () => {
    it("有効な項目定義を受け入れる", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "hometown",
            label: "出身地",
            placeholder: "例: 東京都",
        });
        expect(result.success).toBe(true);
    });

    it("placeholder を省略してもデフォルト空文字で受け入れる", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "field1",
            label: "テスト",
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.placeholder).toBe("");
        }
    });

    it("ID が空の場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "",
            label: "テスト",
        });
        expect(result.success).toBe(false);
    });

    it("ID が大文字を含む場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "MyField",
            label: "テスト",
        });
        expect(result.success).toBe(false);
    });

    it("ID が数字で始まる場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "1field",
            label: "テスト",
        });
        expect(result.success).toBe(false);
    });

    it("ID にハイフンを含む場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "my-field",
            label: "テスト",
        });
        expect(result.success).toBe(false);
    });

    it("ラベルが空の場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "field1",
            label: "",
        });
        expect(result.success).toBe(false);
    });

    it("ラベルが30文字を超える場合を拒否する", () => {
        const result = ProfileFieldDefinitionSchema.safeParse({
            id: "field1",
            label: "A".repeat(31),
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// createProfileSchema (動的プロフィールスキーマ)
// ============================================================

describe("createProfileSchema", () => {
    const twoFields: ProfileFieldDefinition[] = [
        { id: "name", label: "名前", placeholder: "" },
        { id: "hobby", label: "趣味", placeholder: "" },
    ];

    it("定義されたフィールドに値があれば受け入れる", () => {
        const schema = createProfileSchema(twoFields);
        const result = schema.safeParse({
            name: "Alice",
            hobby: "Reading",
        });
        expect(result.success).toBe(true);
    });

    it("1フィールドのみ入力で受け入れる", () => {
        const schema = createProfileSchema(twoFields);
        const result = schema.safeParse({
            name: "Alice",
        });
        expect(result.success).toBe(true);
    });

    it("全フィールド空だと拒否する", () => {
        const schema = createProfileSchema(twoFields);
        const result = schema.safeParse({
            name: "",
            hobby: "",
        });
        expect(result.success).toBe(false);
    });

    it("デフォルトの PROFILE_FIELDS でスキーマを生成できる", () => {
        const schema = createProfileSchema(DEFAULT_PROFILE_FIELDS);
        const profile: Record<string, string> = {};
        for (const f of DEFAULT_PROFILE_FIELDS) {
            profile[f.id] = "";
        }
        profile["hometown"] = "Tokyo";
        const result = schema.safeParse(profile);
        expect(result.success).toBe(true);
    });
});

// ============================================================
// UpdateFieldsSchema
// ============================================================

describe("UpdateFieldsSchema", () => {
    it("有効なフィールド配列を受け入れる", () => {
        const result = UpdateFieldsSchema.safeParse({
            fields: [
                { id: "hometown", label: "出身地", placeholder: "" },
                { id: "hobby", label: "趣味" },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("空配列を拒否する", () => {
        const result = UpdateFieldsSchema.safeParse({ fields: [] });
        expect(result.success).toBe(false);
    });

    it("MAX_PROFILE_FIELDS + 1 個の場合を拒否する", () => {
        const fields = Array.from({ length: MAX_PROFILE_FIELDS + 1 }, (_, i) => ({
            id: `f${i}`,
            label: `F${i}`,
        }));
        const result = UpdateFieldsSchema.safeParse({ fields });
        expect(result.success).toBe(false);
    });

    it("ID 重複を拒否する", () => {
        const result = UpdateFieldsSchema.safeParse({
            fields: [
                { id: "same", label: "A" },
                { id: "same", label: "B" },
            ],
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// AIRequestSubmitSchema
// ============================================================

describe("AIRequestSubmitSchema", () => {
    it("プリセットのみで受け入れる", () => {
        const result = AIRequestSubmitSchema.safeParse({
            presets: ["もっと面白い質問にして"],
            freeText: "",
        });
        expect(result.success).toBe(true);
    });

    it("自由テキストのみで受け入れる", () => {
        const result = AIRequestSubmitSchema.safeParse({
            presets: [],
            freeText: "ペットに関する項目",
        });
        expect(result.success).toBe(true);
    });

    it("プリセットも自由テキストも空だと拒否する", () => {
        const result = AIRequestSubmitSchema.safeParse({
            presets: [],
            freeText: "",
        });
        expect(result.success).toBe(false);
    });

    it("自由テキストが200文字を超えると拒否する", () => {
        const result = AIRequestSubmitSchema.safeParse({
            presets: [],
            freeText: "A".repeat(201),
        });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// AIRequestAdoptSchema
// ============================================================

describe("AIRequestAdoptSchema", () => {
    it("有効なフィールド配列を受け入れる", () => {
        const result = AIRequestAdoptSchema.safeParse({
            fields: [
                { id: "pet", label: "ペット", placeholder: "例: 猫" },
            ],
        });
        expect(result.success).toBe(true);
    });

    it("空の配列を拒否する", () => {
        const result = AIRequestAdoptSchema.safeParse({ fields: [] });
        expect(result.success).toBe(false);
    });
});

// ============================================================
// SetThemeSchema
// ============================================================

describe("SetThemeSchema", () => {
    it("有効なテーマ名を受け付ける", () => {
        const themes = ["subtle", "fun", "cyber", "party", "sakura"];
        for (const theme of themes) {
            const result = SetThemeSchema.safeParse({ theme });
            expect(result.success).toBe(true);
        }
    });

    it("無効なテーマ名を拒否する", () => {
        const result = SetThemeSchema.safeParse({ theme: "invalid-theme" });
        expect(result.success).toBe(false);
    });

    it("空文字列を拒否する", () => {
        const result = SetThemeSchema.safeParse({ theme: "" });
        expect(result.success).toBe(false);
    });

    it("theme フィールドが欠けている場合拒否する", () => {
        const result = SetThemeSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

// ============================================================
// SendInviteSchema
// ============================================================

describe("SendInviteSchema", () => {
    it("有効な招待メッセージを受け付ける", () => {
        const result = SendInviteSchema.safeParse({ message: "面白い話題があるよ！" });
        expect(result.success).toBe(true);
    });

    it("空文字列を拒否する", () => {
        const result = SendInviteSchema.safeParse({ message: "" });
        expect(result.success).toBe(false);
    });

    it("最大長のメッセージを受け付ける", () => {
        const result = SendInviteSchema.safeParse({ message: "あ".repeat(INVITE_MAX_MESSAGE_LENGTH) });
        expect(result.success).toBe(true);
    });

    it("最大長を超えるメッセージを拒否する", () => {
        const result = SendInviteSchema.safeParse({ message: "あ".repeat(INVITE_MAX_MESSAGE_LENGTH + 1) });
        expect(result.success).toBe(false);
    });

    it("message フィールドが欠けている場合拒否する", () => {
        const result = SendInviteSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

// ============================================================
// SendReactionSchema
// ============================================================

describe("SendReactionSchema", () => {
    it("有効なリアクション ID を受け付ける", () => {
        const result = SendReactionSchema.safeParse({ reactionId: "emoji-clap" });
        expect(result.success).toBe(true);
    });

    it("空文字列を拒否する", () => {
        const result = SendReactionSchema.safeParse({ reactionId: "" });
        expect(result.success).toBe(false);
    });

    it("最大長のリアクション ID を受け付ける", () => {
        const result = SendReactionSchema.safeParse({ reactionId: "a".repeat(REACTION_ID_MAX_LENGTH) });
        expect(result.success).toBe(true);
    });

    it("最大長を超えるリアクション ID を拒否する", () => {
        const result = SendReactionSchema.safeParse({ reactionId: "a".repeat(REACTION_ID_MAX_LENGTH + 1) });
        expect(result.success).toBe(false);
    });

    it("reactionId フィールドが欠けている場合拒否する", () => {
        const result = SendReactionSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});

// ============================================================
// KickParticipantSchema
// ============================================================

describe("KickParticipantSchema", () => {
    it("有効な UUID を受け入れる", () => {
        const result = KickParticipantSchema.safeParse({
            targetParticipantId: "550e8400-e29b-41d4-a716-446655440000",
        });
        expect(result.success).toBe(true);
    });

    it("UUID でない文字列を拒否する", () => {
        const result = KickParticipantSchema.safeParse({
            targetParticipantId: "not-a-uuid",
        });
        expect(result.success).toBe(false);
    });

    it("targetParticipantId フィールドが欠けている場合拒否する", () => {
        const result = KickParticipantSchema.safeParse({});
        expect(result.success).toBe(false);
    });
});
