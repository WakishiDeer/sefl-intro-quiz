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
} from "./validation.js";
import { DEFAULT_PROFILE_FIELDS, MAX_PROFILE_FIELDS } from "./constants.js";
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

describe("AIOutputJsonSchema", () => {
    it("トップレベルに type: 'object' が存在する（Claude API 必須）", () => {
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
