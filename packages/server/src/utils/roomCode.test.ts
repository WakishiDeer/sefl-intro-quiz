/**
 * roomCode.test.ts — generateRoomCode のユニットテスト
 */

import { describe, it, expect } from "vitest";
import { generateRoomCode } from "./roomCode.js";
import { ROOM_CODE_LENGTH, ROOM_CODE_CHARSET } from "@self-intro-quiz/shared";
import type { RoomRepository } from "../domain/room/RoomRepository.js";

/** テスト用の空リポジトリ */
function emptyRepo(): RoomRepository {
    return {
        save: () => { },
        findByCode: () => undefined,
        delete: () => { },
        has: () => false,
        findAll: () => new Map<string, never>().entries(),
        getActiveRoomCount: () => 0,
    };
}

/** テスト用の全コード衝突リポジトリ */
function fullRepo(): RoomRepository {
    return {
        save: () => { },
        findByCode: () => undefined,
        delete: () => { },
        has: () => true, // 常に衝突
        findAll: () => new Map<string, never>().entries(),
        getActiveRoomCount: () => 0,
    };
}

describe("generateRoomCode", () => {
    it("指定された長さのコードを生成する", () => {
        const code = generateRoomCode(emptyRepo());
        expect(code.length).toBe(ROOM_CODE_LENGTH);
    });

    it("許可された文字セットのみで構成される", () => {
        for (let i = 0; i < 100; i++) {
            const code = generateRoomCode(emptyRepo());
            for (const char of code) {
                expect(ROOM_CODE_CHARSET).toContain(char);
            }
        }
    });

    it("常に衝突する場合エラーをスローする", () => {
        expect(() => generateRoomCode(fullRepo())).toThrow(
            "Failed to generate unique room code",
        );
    });
});
