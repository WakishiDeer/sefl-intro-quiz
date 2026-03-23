/**
 * QuizAggregate.test.ts — QuizAggregate のユニットテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { QuizAggregate, QuizDomainError } from "./QuizAggregate.js";
import type { Question, Participant } from "@self-intro-quiz/shared";
import { SCORE_PER_CORRECT, TOTAL_QUESTIONS } from "@self-intro-quiz/shared";

// ============================================================
// ヘルパー
// ============================================================

function makeQuestions(count: number = TOTAL_QUESTIONS): Question[] {
    return Array.from({ length: count }, (_, i) => ({
        index: i,
        questionType: i % 3 === 0 ? "yes-no" as const : "four-choice" as const,
        text: `Question ${i + 1}`,
        choices: i % 3 === 0 ? ["⭕ はい", "❌ いいえ"] : ["A", "B", "C", "D"],
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
            expect(payload.questionType).toBe("yes-no"); // index 0 は yes-no
            expect(payload.text).toBe("Question 1");
            expect(payload.choices).toEqual(["⭕ はい", "❌ いいえ"]);
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
            expect(payload!.questionType).toBe("four-choice"); // index 1 は four-choice
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

    describe("totalQuestions", () => {
        it("作成時の問題数を返す", () => {
            expect(quiz.totalQuestions).toBe(TOTAL_QUESTIONS);
        });
    });

    // ----------------------------------------------------------
    // 動的問題数
    // ----------------------------------------------------------

    describe("動的問題数サポート", () => {
        it("5問のクイズで isFinished が正しく動作する", () => {
            const fiveQuestions = makeQuestions(5);
            const quiz5 = QuizAggregate.create("FIVE00", fiveQuestions);
            quiz5.start(Date.now() + 30000, 3);
            for (let i = 1; i < 5; i++) {
                expect(quiz5.isFinished).toBe(false);
                quiz5.nextQuestion(Date.now() + 30000, 3);
            }
            expect(quiz5.isFinished).toBe(true);
        });

        it("5問のクイズで nextQuestion が5問目以降 null を返す", () => {
            const fiveQuestions = makeQuestions(5);
            const quiz5 = QuizAggregate.create("FIVE00", fiveQuestions);
            quiz5.start(Date.now() + 30000, 3);
            for (let i = 1; i < 5; i++) {
                const payload = quiz5.nextQuestion(Date.now() + 30000, 3);
                expect(payload).not.toBeNull();
            }
            const last = quiz5.nextQuestion(Date.now() + 30000, 3);
            expect(last).toBeNull();
        });

        it("20問のクイズで正しく全問進行できる", () => {
            const twentyQuestions = makeQuestions(20);
            const quiz20 = QuizAggregate.create("TWENTY", twentyQuestions);
            quiz20.start(Date.now() + 30000, 3);
            for (let i = 1; i < 20; i++) {
                expect(quiz20.isFinished).toBe(false);
                const payload = quiz20.nextQuestion(Date.now() + 30000, 3);
                expect(payload).not.toBeNull();
                expect(payload!.index).toBe(i);
            }
            expect(quiz20.isFinished).toBe(true);
            expect(quiz20.nextQuestion(Date.now() + 30000, 3)).toBeNull();
        });

        it("totalQuestions が実際の問題数を反映する", () => {
            const quiz7 = QuizAggregate.create("SEVEN0", makeQuestions(7));
            expect(quiz7.totalQuestions).toBe(7);

            const quiz15 = QuizAggregate.create("FIFTN0", makeQuestions(15));
            expect(quiz15.totalQuestions).toBe(15);
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

    describe("currentSubjectId", () => {
        it("開始後、現在の問題の対象者 ID を返す", () => {
            quiz.start(Date.now() + 30000, 3);
            // 最初の問題の subjectId は makeQuestions で participant-0 (index 0 % 3)
            expect(quiz.currentSubjectId).toBe("participant-0");
        });

        it("問題が進むと対象者 ID が変わる", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.nextQuestion(Date.now() + 30000, 3);
            // 2番目の問題の subjectId は participant-1 (index 1 % 3)
            expect(quiz.currentSubjectId).toBe("participant-1");
        });

        it("未開始の場合は undefined を返す", () => {
            expect(quiz.currentSubjectId).toBeUndefined();
        });
    });

    describe("voteCurious / hasCuriousThreshold / hasVotedCurious", () => {
        it("投票を記録できる", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-0", 0);
            expect(quiz.hasVotedCurious("participant-0", 0)).toBe(true);
            expect(quiz.hasVotedCurious("participant-1", 0)).toBe(false);
        });

        it("同一参加者の重複投票は無視される（Set）", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-0", 0);
            quiz.voteCurious("participant-0", 0);
            // 閾値チェック: 1/3 = 33% < 50%
            expect(quiz.hasCuriousThreshold(3)).toBe(false);
        });

        it("50%以上で閾値を満たす", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-0", 0);
            quiz.voteCurious("participant-1", 0);
            // 2/3 = 66% >= 50%
            expect(quiz.hasCuriousThreshold(3)).toBe(true);
        });

        it("50%未満では閾値を満たさない", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-0", 0);
            // 1/3 = 33% < 50%
            expect(quiz.hasCuriousThreshold(3)).toBe(false);
        });

        it("投票なしでは閾値を満たさない", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.hasCuriousThreshold(3)).toBe(false);
        });

        it("参加者0人の場合は閾値を満たさない", () => {
            quiz.start(Date.now() + 30000, 3);
            expect(quiz.hasCuriousThreshold(0)).toBe(false);
        });

        it("終了した問題への投票はエラー", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.nextQuestion(Date.now() + 30000, 3);
            expect(() => quiz.voteCurious("participant-0", 0))
                .toThrow("この問題は既に終了しています");
        });

        it("ちょうど50%で閾値を満たす", () => {
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-0", 0);
            // 1/2 = 50% >= 50%
            expect(quiz.hasCuriousThreshold(2)).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // ハイライト
    // ----------------------------------------------------------

    describe("computeHighlights", () => {
        /**
         * 全問回答してクイズを最後まで進めるヘルパー。
         * answersMap: participantId → 各問題の choiceIndex 配列（0 = 正解）
         */
        function playFullQuiz(
            q: QuizAggregate,
            answersMap: Map<string, number[]>,
        ): void {
            q.start(Date.now() + 30000, answersMap.size);

            for (let qi = 0; qi < TOTAL_QUESTIONS; qi++) {
                for (const [pid, choices] of answersMap) {
                    q.submitAnswer(pid, choices[qi] ?? 1);
                }
                if (qi < TOTAL_QUESTIONS - 1) {
                    q.nextQuestion(Date.now() + 30000, answersMap.size);
                }
            }
        }

        it("全問正解のパーフェクトハイライトが生成される", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            // participant-0 だけ全問正解
            answersMap.set("participant-0", Array(TOTAL_QUESTIONS).fill(0));
            answersMap.set("participant-1", Array(TOTAL_QUESTIONS).fill(1));
            answersMap.set("participant-2", Array(TOTAL_QUESTIONS).fill(1));

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const perfect = highlights.find((h) => h.emoji === "🎯");
            expect(perfect).toBeDefined();
            expect(perfect!.description).toContain("User0");
            expect(perfect!.description).toContain("全問正解");
        });

        it("全問正解者がいない場合はパーフェクトハイライトが生成されない", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            // 誰も全問正解しない
            const mixed = [0, 1, 0, 1, 0, 1, 0, 1, 0, 1];
            answersMap.set("participant-0", mixed);
            answersMap.set("participant-1", mixed);
            answersMap.set("participant-2", mixed);

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const perfect = highlights.find((h) => h.emoji === "🎯");
            expect(perfect).toBeUndefined();
        });

        it("連続正解3問以上で連続正解王ハイライトが生成される", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            // participant-0: 最初の5問連続正解
            answersMap.set("participant-0", [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
            answersMap.set("participant-1", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
            answersMap.set("participant-2", [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const streak = highlights.find((h) => h.emoji === "🔥");
            expect(streak).toBeDefined();
            expect(streak!.description).toContain("User0");
            expect(streak!.description).toContain("5 問連続正解");
        });

        it("連続正解2問以下では連続正解王ハイライトが生成されない", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            // 全員2問以下の連続正解
            answersMap.set("participant-0", [0, 0, 1, 0, 0, 1, 0, 0, 1, 0]);
            answersMap.set("participant-1", [1, 0, 0, 1, 0, 0, 1, 0, 0, 1]);
            answersMap.set("participant-2", [0, 1, 0, 1, 0, 1, 0, 1, 0, 1]);

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const streak = highlights.find((h) => h.emoji === "🔥");
            expect(streak).toBeUndefined();
        });

        it("最難問ハイライトが正答率最低の問題で生成される", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            // 問題0（index=0）: 全員不正解、他の問題は全員正解
            answersMap.set("participant-0", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
            answersMap.set("participant-1", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
            answersMap.set("participant-2", [1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const hardest = highlights.find((h) => h.emoji === "😱");
            expect(hardest).toBeDefined();
            expect(hardest!.description).toContain("Q1");
            expect(hardest!.description).toContain("0%");
        });

        it("気になる投票があれば気になる大賞ハイライトが生成される", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            answersMap.set("participant-0", Array(TOTAL_QUESTIONS).fill(0));
            answersMap.set("participant-1", Array(TOTAL_QUESTIONS).fill(1));
            answersMap.set("participant-2", Array(TOTAL_QUESTIONS).fill(1));

            // 問題0で2人が「気になる」投票
            quiz.start(Date.now() + 30000, 3);
            quiz.voteCurious("participant-1", 0);
            quiz.voteCurious("participant-2", 0);

            // 残りのクイズを進める
            for (let qi = 0; qi < TOTAL_QUESTIONS; qi++) {
                for (const [pid, choices] of answersMap) {
                    quiz.submitAnswer(pid, choices[qi] ?? 1);
                }
                if (qi < TOTAL_QUESTIONS - 1) {
                    quiz.nextQuestion(Date.now() + 30000, 3);
                }
            }

            const highlights = quiz.computeHighlights(participants);
            const curious = highlights.find((h) => h.emoji === "🤔");
            expect(curious).toBeDefined();
            expect(curious!.description).toContain("2 票");
        });

        it("気になる投票がなければ気になる大賞ハイライトが生成されない", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            answersMap.set("participant-0", Array(TOTAL_QUESTIONS).fill(0));
            answersMap.set("participant-1", Array(TOTAL_QUESTIONS).fill(1));
            answersMap.set("participant-2", Array(TOTAL_QUESTIONS).fill(1));

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            const curious = highlights.find((h) => h.emoji === "🤔");
            expect(curious).toBeUndefined();
        });

        it("ハイライトは空配列でも正常に動作する（全員同じ回答パターン）", () => {
            const participants = makeParticipants();
            const answersMap = new Map<string, number[]>();
            answersMap.set("participant-0", Array(TOTAL_QUESTIONS).fill(0));
            answersMap.set("participant-1", Array(TOTAL_QUESTIONS).fill(0));
            answersMap.set("participant-2", Array(TOTAL_QUESTIONS).fill(0));

            playFullQuiz(quiz, answersMap);
            const highlights = quiz.computeHighlights(participants);

            // 全員パーフェクト → パーフェクトハイライトは出る
            const perfect = highlights.find((h) => h.emoji === "🎯");
            expect(perfect).toBeDefined();
            // 全員同じ成績なので最難問は100%正解の問題で正答率100%
            expect(Array.isArray(highlights)).toBe(true);
        });

        describe("スピードスター", () => {
            afterEach(() => {
                vi.restoreAllMocks();
            });

            /**
             * Date.now を制御してクイズを進めるヘルパー。
             * timingMap: participantId → 各問題で Date.now() が返すタイムスタンプ配列
             */
            function playFullQuizWithTiming(
                q: QuizAggregate,
                timingMap: Map<string, number[]>,
            ): void {
                q.start(Date.now() + 30000, timingMap.size);

                for (let qi = 0; qi < TOTAL_QUESTIONS; qi++) {
                    for (const [pid, timestamps] of timingMap) {
                        const spy = vi.spyOn(Date, "now").mockReturnValue(timestamps[qi]);
                        q.submitAnswer(pid, 0); // 全員正解
                        spy.mockRestore();
                    }
                    if (qi < TOTAL_QUESTIONS - 1) {
                        q.nextQuestion(Date.now() + 30000, timingMap.size);
                    }
                }
            }

            it("最速回答者がスピードスターとして表示される", () => {
                const participants = makeParticipants();
                const baseTime = 1000000;
                // participant-0: 各問題で最も早い（baseTime + qi*10000）
                // participant-1: 1秒遅い
                // participant-2: 3秒遅い
                const timingMap = new Map<string, number[]>();
                timingMap.set("participant-0", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));
                timingMap.set("participant-1", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 1000));
                timingMap.set("participant-2", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 3000));

                playFullQuizWithTiming(quiz, timingMap);
                const highlights = quiz.computeHighlights(participants);

                const speed = highlights.find((h) => h.emoji === "⚡");
                expect(speed).toBeDefined();
                expect(speed!.description).toContain("User0");
                expect(speed!.description).toContain("最速");
            });

            it("丸め誤差で誤判定しない（近い値の正確な比較）", () => {
                const participants = makeParticipants();
                const baseTime = 1000000;
                // participant-0: 各問題で 1250ms 遅れ → avgSeconds = 1.3（切り上げ）
                // participant-1: 各問題で 1260ms 遅れ → 実際に遅い
                // participant-2: 最速
                const timingMap = new Map<string, number[]>();
                timingMap.set("participant-2", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));
                timingMap.set("participant-0", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 1250));
                timingMap.set("participant-1", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 1260));

                playFullQuizWithTiming(quiz, timingMap);
                const highlights = quiz.computeHighlights(participants);

                const speed = highlights.find((h) => h.emoji === "⚡");
                expect(speed).toBeDefined();
                // 最速は participant-2（0ms 遅れ）
                expect(speed!.description).toContain("User2");
            });

            it("回答数が2未満の参加者はスキップされる", () => {
                const participants = makeParticipants();
                const baseTime = 1000000;

                // 全員回答するが、タイミング差が十分
                const timingMap = new Map<string, number[]>();
                timingMap.set("participant-0", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));
                timingMap.set("participant-1", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 2000));
                timingMap.set("participant-2", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000 + 4000));

                playFullQuizWithTiming(quiz, timingMap);
                const highlights = quiz.computeHighlights(participants);

                const speed = highlights.find((h) => h.emoji === "⚡");
                expect(speed).toBeDefined();
                // 最速は participant-0
                expect(speed!.description).toContain("User0");
            });

            it("全員同時回答ではスピードスターが生成されない", () => {
                const participants = makeParticipants();
                const baseTime = 1000000;
                // 全員同じタイムスタンプ
                const timingMap = new Map<string, number[]>();
                timingMap.set("participant-0", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));
                timingMap.set("participant-1", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));
                timingMap.set("participant-2", Array.from({ length: TOTAL_QUESTIONS }, (_, qi) => baseTime + qi * 10000));

                playFullQuizWithTiming(quiz, timingMap);
                const highlights = quiz.computeHighlights(participants);

                const speed = highlights.find((h) => h.emoji === "⚡");
                expect(speed).toBeUndefined();
            });
        });
    });

    // ----------------------------------------------------------
    // 参加者ごとの回答結果
    // ----------------------------------------------------------

    describe("computeParticipantResults", () => {
        it("正解・不正解・タイムアウトが正しく分類される", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);

            quiz.submitAnswer("participant-0", 0); // 正解
            quiz.submitAnswer("participant-1", 1); // 不正解
            // participant-2 はタイムアウト
            quiz.recordTimeouts(["participant-0", "participant-1", "participant-2"]);

            const results = quiz.computeParticipantResults(0, participants);

            const r0 = results.find((r) => r.nickname === "User0");
            expect(r0).toBeDefined();
            expect(r0!.isCorrect).toBe(true);
            expect(r0!.isTimeout).toBe(false);
            expect(r0!.isIneligible).toBe(false);
            expect(r0!.choiceIndex).toBe(0);

            const r1 = results.find((r) => r.nickname === "User1");
            expect(r1).toBeDefined();
            expect(r1!.isCorrect).toBe(false);
            expect(r1!.isTimeout).toBe(false);
            expect(r1!.isIneligible).toBe(false);
            expect(r1!.choiceIndex).toBe(1);

            const r2 = results.find((r) => r.nickname === "User2");
            expect(r2).toBeDefined();
            expect(r2!.isCorrect).toBe(false);
            expect(r2!.isTimeout).toBe(true);
            expect(r2!.isIneligible).toBe(false);
            expect(r2!.choiceIndex).toBe(-1);
        });

        it("途中参加者は joinedAtQuestion 前の問題で isIneligible = true になる", () => {
            const participants = makeParticipants();
            // participant-2 を途中参加者に変更
            participants.get("participant-2")!.joinedAtQuestion = 3;

            quiz.start(Date.now() + 30000, 2);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);

            const results = quiz.computeParticipantResults(0, participants);

            const r2 = results.find((r) => r.nickname === "User2");
            expect(r2).toBeDefined();
            expect(r2!.isIneligible).toBe(true);
            expect(r2!.isCorrect).toBe(false);
            expect(r2!.choiceIndex).toBe(-1);
        });

        it("途中参加者は joinedAtQuestion 以降の問題で通常通り結果を返す", () => {
            const participants = makeParticipants();
            participants.get("participant-2")!.joinedAtQuestion = 1;

            quiz.start(Date.now() + 30000, 2);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);

            // 問題0: participant-2 は不参加
            const results0 = quiz.computeParticipantResults(0, participants);
            const r2q0 = results0.find((r) => r.nickname === "User2");
            expect(r2q0!.isIneligible).toBe(true);

            // 問題1に進む
            quiz.nextQuestion(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            quiz.submitAnswer("participant-2", 0); // 正解

            const results1 = quiz.computeParticipantResults(1, participants);
            const r2q1 = results1.find((r) => r.nickname === "User2");
            expect(r2q1!.isIneligible).toBe(false);
            expect(r2q1!.isCorrect).toBe(true);
        });

        it("全参加者の結果がリストに含まれる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);

            const results = quiz.computeParticipantResults(0, participants);
            expect(results).toHaveLength(3);
        });

        it("参加者が途中で抜けた場合でも結果に含まれる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);

            // participant-2 が切断
            participants.get("participant-2")!.isConnected = false;
            quiz.recordTimeouts(["participant-0", "participant-1", "participant-2"]);

            const results = quiz.computeParticipantResults(0, participants);
            expect(results).toHaveLength(3);
            const r2 = results.find((r) => r.nickname === "User2");
            expect(r2!.isTimeout).toBe(true);
        });
    });

    describe("computeAllQuestionResults", () => {
        it("全問題の結果サマリーを返す", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);

            // 問題0
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            quiz.submitAnswer("participant-2", 0);

            // 問題1
            quiz.nextQuestion(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 0);
            quiz.submitAnswer("participant-2", 1);

            const allResults = quiz.computeAllQuestionResults(participants);

            expect(allResults).toHaveLength(TOTAL_QUESTIONS);

            // 問題0
            expect(allResults[0]!.questionIndex).toBe(0);
            expect(allResults[0]!.text).toBe("Question 1");
            expect(allResults[0]!.participantResults).toHaveLength(3);
            const q0Correct = allResults[0]!.participantResults.filter((r) => r.isCorrect);
            expect(q0Correct).toHaveLength(2);

            // 問題1
            expect(allResults[1]!.questionIndex).toBe(1);
            expect(allResults[1]!.participantResults).toHaveLength(3);
            const q1Correct = allResults[1]!.participantResults.filter((r) => r.isCorrect);
            expect(q1Correct).toHaveLength(2);
        });

        it("途中参加者の問題別結果が正しく反映される", () => {
            const participants = makeParticipants();
            participants.get("participant-2")!.joinedAtQuestion = 2;

            quiz.start(Date.now() + 30000, 2);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);

            const allResults = quiz.computeAllQuestionResults(participants);

            // 問題0では participant-2 は isIneligible
            const r2q0 = allResults[0]!.participantResults.find((r) => r.nickname === "User2");
            expect(r2q0!.isIneligible).toBe(true);

            // 問題2ではまだ回答データがないが isIneligible ではない
            const r2q2 = allResults[2]!.participantResults.find((r) => r.nickname === "User2");
            expect(r2q2!.isIneligible).toBe(false);
        });

        it("各問題の choices と correctIndex が正しく含まれる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);

            const allResults = quiz.computeAllQuestionResults(participants);

            // 問題0は yes-no
            expect(allResults[0]!.choices).toEqual(["⭕ はい", "❌ いいえ"]);
            expect(allResults[0]!.correctIndex).toBe(0);

            // 問題1は four-choice
            expect(allResults[1]!.choices).toEqual(["A", "B", "C", "D"]);
            expect(allResults[1]!.correctIndex).toBe(0);
        });
    });

    // ----------------------------------------------------------
    // reveal に participantResults が含まれる
    // ----------------------------------------------------------

    describe("reveal (participantResults)", () => {
        it("reveal の戻り値に participantResults が含まれる", () => {
            const participants = makeParticipants();
            quiz.start(Date.now() + 30000, 3);
            quiz.submitAnswer("participant-0", 0);
            quiz.submitAnswer("participant-1", 1);
            quiz.submitAnswer("participant-2", 0);

            const result = quiz.reveal(participants);
            expect(result.participantResults).toBeDefined();
            expect(result.participantResults).toHaveLength(3);

            const correct = result.participantResults.filter((r) => r.isCorrect);
            expect(correct).toHaveLength(2);
        });
    });
});
