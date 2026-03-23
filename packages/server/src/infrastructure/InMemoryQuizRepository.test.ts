/**
 * InMemoryQuizRepository.test.ts — InMemoryQuizRepository のユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryQuizRepository } from "./InMemoryQuizRepository.js";
import type { Quiz } from "@self-intro-quiz/shared";

function makeQuiz(roomCode: string): Quiz {
    return {
        roomCode,
        questions: [],
        currentQuestionIndex: -1,
        timerEndsAt: null,
        answers: new Map(),
        curiousVotes: new Map(),
    };
}

describe("InMemoryQuizRepository", () => {
    let repo: InMemoryQuizRepository;

    beforeEach(() => {
        repo = new InMemoryQuizRepository();
    });

    describe("save / findByRoomCode", () => {
        it("保存したクイズを取得できる", () => {
            const quiz = makeQuiz("ABC123");
            repo.save(quiz);
            expect(repo.findByRoomCode("ABC123")).toBe(quiz);
        });

        it("存在しないコードは undefined を返す", () => {
            expect(repo.findByRoomCode("XXXXXX")).toBeUndefined();
        });
    });

    describe("delete", () => {
        it("クイズを削除できる", () => {
            repo.save(makeQuiz("ABC123"));
            repo.delete("ABC123");
            expect(repo.findByRoomCode("ABC123")).toBeUndefined();
        });
    });
});
