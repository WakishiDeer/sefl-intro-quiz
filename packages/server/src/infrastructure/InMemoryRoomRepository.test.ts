/**
 * InMemoryRoomRepository.test.ts — InMemoryRoomRepository のユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryRoomRepository } from "./InMemoryRoomRepository.js";
import type { Room } from "@self-intro-quiz/shared";
import { DEFAULT_PROFILE_FIELDS } from "@self-intro-quiz/shared";

function makeRoom(code: string): Room {
    return {
        code,
        hostId: "host-1",
        phase: "lobby",
        participants: new Map(),
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        profileFields: [...DEFAULT_PROFILE_FIELDS],
    };
}

describe("InMemoryRoomRepository", () => {
    let repo: InMemoryRoomRepository;

    beforeEach(() => {
        repo = new InMemoryRoomRepository();
    });

    describe("save / findByCode", () => {
        it("保存したルームを取得できる", () => {
            const room = makeRoom("ABC123");
            repo.save(room);
            expect(repo.findByCode("ABC123")).toBe(room);
        });

        it("存在しないコードは undefined を返す", () => {
            expect(repo.findByCode("XXXXXX")).toBeUndefined();
        });
    });

    describe("has", () => {
        it("存在するコードで true を返す", () => {
            repo.save(makeRoom("ABC123"));
            expect(repo.has("ABC123")).toBe(true);
        });

        it("存在しないコードで false を返す", () => {
            expect(repo.has("XXXXXX")).toBe(false);
        });
    });

    describe("delete", () => {
        it("ルームを削除できる", () => {
            repo.save(makeRoom("ABC123"));
            repo.delete("ABC123");
            expect(repo.has("ABC123")).toBe(false);
        });
    });

    describe("findAll", () => {
        it("全ルームを取得できる", () => {
            repo.save(makeRoom("AAA111"));
            repo.save(makeRoom("BBB222"));
            const all = Array.from(repo.findAll());
            expect(all.length).toBe(2);
        });
    });

    describe("getActiveRoomCount", () => {
        it("ルーム数を返す", () => {
            expect(repo.getActiveRoomCount()).toBe(0);
            repo.save(makeRoom("AAA111"));
            expect(repo.getActiveRoomCount()).toBe(1);
        });
    });
});
