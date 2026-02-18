/**
 * QuizAggregate.test.ts — QuizAggregate のユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QuizAggregate, QuizDomainError } from "./QuizAggregate.js";
import type { Question, Participant } from "@self-intro-quiz/shared";
import { SCORE_PER_CORRECT, TOTAL_QUESTIONS } from "@self-intro-quiz/shared";

// ============================================================
// ヘルパー
// ============================================================

function makeQuestions(count: number = TOTAL_QUESTIONS): Question[] {
    return Array.from({ length: count }, (_, i) => ({
        index: i,
        text: `Question ${i + 1}`,
        choices: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: `Explanation ${i + 1}`,
        subjectId: `participant-${i % 3}`,
    }));
}

function makeParticipants(): Map<string, Participant> {
    const map = new Map<string, Participant>();
    for (let i = 0; i < 3; i++) {
        map.set(`participant-${i}`, {
            id: `participant-${i}`,
            nickname: `User${i}`,
            socketId: `socket-${i}`,
            profile: null,
            isHost: i === 0,
            joinedAtQuestion: -1,
            isConnected: true,
            joinedAt: Date.now(),
        });
    }
    return map;
}

// ============================================================
// テスト
// ============================================================

describe("QuizAggregate", () => {
    let quiz: QuizAggregate;
    const questions = makeQuestions();

    beforeEach(() => {
        quiz = QuizAggregate.create("ABC123", questions);
    });

    // ----------------------------------------------------------
    // ファクトリ
    // ----------------------------------------------------------

    describe("create", () => {
        it("roomCode が設定される", () => {
            expect(quiz.roomCode).toBe("ABC123");
        });

        it("currentQuestionIndex が -1 で初期化される", () => {
            expect(quiz.currentQuestionIndex).toBe(-1);
        });
    });

    // ----------------------------------------------------------
    // クイズ進行
    // ----------------------------------------------------------

    describe("start", () => {
        it("最初の問題を開始する", () => {
            const timerEndsAt = Date.now() + 30000;
            const payload = quiz.start(timerEndsAt, 3);

            expect(payload.index).toBe(0);
            expect(payload.text).toBe("Question 1");
            expect(payload.choices).toEqual(["A", "B", "C", "D"]);
            expect(payload.timerEndsAt).toBe(timerEndsAt);
            expect(payload.totalParticipants).toBe(3);
            expect(quiz.currentQuestionIndex).toBe(0);
        });
    });

    describe("nextQuestion", () => {
        it("次の問題に進む", () => {
            quiz.start(Date.now() + 30000, 3);
            const payload = quiz.nextQuestion(Date.now() + 30000, 3);

            expect(payload).not.toBeNull();
            expect(payload!.index).toBe(1);
            expect(payload!.text).toBe("Question 2");
        });

        it("全問終了後は null を返す", () => {
            const timerEndsAt = Date.now() + 30000;
            quiz.start(timerEndsAt, 3);
            for (let i = 1; i < TOTAL_QUESTIONS; i++) {
                quiz.nextQuestion(timerEndsAt, 3);
            }

            const result = quiz.nextQuestion(timerEndsAt, 3);
            expect(result).toBeNull();
        });
    });

    // ----------------------------------------------------------
    // 回答処理
    // ----------------------------------------------------------

    describe("submitAnswer", () => {
        beforeEach(() => {
            quiz.start(Date.now() + 30000, 3);
        });

        it("正解時に isCorrect が true になる", () => {
            const answer = quiz.submitAnswer("participant-0", 0); // correctIndex = 0
            expect(answer.isCorrect).toBe(true);
            expect(answer.choiceIndex).toBe(0);
            expect(answer.questionIndex).toBe(0);
        });

        it("不正解時に isCorrect が false になる", () => {
            const answer = quiz.submitAnswer("participant-0", 1);
            expect(answer.isCorrect).toBe(false);
        });

        it("同じ問題に2回回答するとエラーをスローする", () => {
            quiz.submitAnswer("participant-0", 0);
            try {
                quiz.submitAnswer("participant-0", 1);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(QuizDomainError);
                expect((e as QuizDomainError).code).toBe("ALREADY_ANSWERED");
            }
        });
    });

    describe("canAnswer", () => {
        it("通常参加者は回答可能", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.canAnswer("participant-0", 0, -1)).toBe(true);
        });

        it("途中参加者は joinedAtQuestion 前の問題に回答不可", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.canAnswer("late-joiner", 0, 3)).toBe(false);
        });

        it("途中参加者は joinedAtQuestion 以降の問題に回答可能", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.canAnswer("late-joiner", 3, 3)).toBe(true);
        });

        it("既回答の場合 false を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            expect(quiz.canAnswer("participant-0", 0, -1)).toBe(false);
        });
    });

    describe("allAnswered", () => {
        beforeEach(() => {
            quiz.start(Date.now() + 30000, 3);
        });

        it("全員回答後に true を返す", () => {
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            quiz.submitAnswer("participant-2", 2);
            expect(quiz.allAnswered(3)).toBe(true);
        });

        it("未回答者がいる場合 false を返す", () => {
            quiz.submitAnswer("participant-0", 0);
            expect(quiz.allAnswered(3)).toBe(false);
        });
    });

    describe("recordTimeouts", () => {
        beforeEach(() => {
            quiz.start(Date.now() + 30000, 3);
        });

        it("未回答者にタイムアウト回答を記録する", () => {
            quiz.submitAnswer("participant-0", 0);
            quiz.recordTimeouts(["participant-0", "participant-1", "participant-2"]);

            // participant-0 は既回答なのでタイムアウトは記録されない
            // participant-1, participant-2 にはタイムアウトが記録される
            expect(quiz.allAnswered(3)).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // 結果
    // ----------------------------------------------------------

    describe("reveal", () => {
        it("正解情報とスコアボードを返す", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0); // 正解
            quiz.submitAnswer("participant-1", 1); // 不正解
            quiz.submitAnswer("participant-2", 0); // 正解

            const result = quiz.reveal(participants);
            expect(result.questionIndex).toBe(0);
            expect(result.correctIndex).toBe(0);
            expect(result.explanation).toBe("Explanation 1");
            expect(result.scores.length).toBe(3);
        });
    });

    describe("computeScoreboard", () => {
        it("スコアの降順でランキングされる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0); // 正解 (100点)
            quiz.submitAnswer("participant-1", 1); // 不正解 (0点)
            quiz.submitAnswer("participant-2", 0); // 正解 (100点)

            const scores = quiz.computeScoreboard(participants);
            expect(scores[0]!.score).toBe(SCORE_PER_CORRECT);
            expect(scores[0]!.rank).toBe(1);
            expect(scores[2]!.score).toBe(0);
        });

        it("同点は同じ順位になる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0); // 正解
            quiz.submitAnswer("participant-2", 0); // 正解

            const scores = quiz.computeScoreboard(participants);
            const topScores = scores.filter((s) => s.score === SCORE_PER_CORRECT);
            expect(topScores.length).toBe(2);
            expect(topScores[0]!.rank).toBe(topScores[1]!.rank);
        });
    });

    // ----------------------------------------------------------
    // クエリ
    // ----------------------------------------------------------

    describe("isFinished", () => {
        it("最終問題に達したら true を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            for (let i = 1; i < TOTAL_QUESTIONS; i++) {
                quiz.nextQuestion(Date.now() + 30000, 3);
            }
            expect(quiz.isFinished).toBe(true);
        });

        it("途中なら false を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.isFinished).toBe(false);
        });
    });

    describe("getAnsweredCount", () => {
        it("現在の問題の回答済み人数を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            expect(quiz.getAnsweredCount()).toBe(2);
        });
    });

    describe("getAnsweredParticipantIds", () => {
        it("回答者がいない場合、空配列を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.getAnsweredParticipantIds()).toEqual([]);
        });

        it("回答済み参加者の ID 一覧を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-2", 1);

            const ids = quiz.getAnsweredParticipantIds();
            expect(ids).toHaveLength(2);
            expect(ids).toContain("participant-0");
            expect(ids).toContain("participant-2");
            expect(ids).not.toContain("participant-1");
        });

        it("全員回答済みの場合、全 ID を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            quiz.submitAnswer("participant-2", 2);

            const ids = quiz.getAnsweredParticipantIds();
            expect(ids).toHaveLength(3);
        });

        it("次の問題に進むと前の問題の回答者を含まない", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.nextQuestion(Date.now() + 30000, 3);

            const ids = quiz.getAnsweredParticipantIds();
            expect(ids).toEqual([]);
        });
    });
});
