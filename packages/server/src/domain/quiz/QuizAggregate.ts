/**
 * QuizAggregate — Quiz Context の集約ルート
 *
 * クイズ進行・回答受付・スコア計算のドメインロジックを集約する。
 * Room Context の participants を読み取り専用で参照する。
 */

import type {
    Quiz,
    Question,
    Answer,
    Participant,
    ScoreEntry,
    QuestionStartPayload,
    QuestionRevealPayload,
} from "@self-intro-quiz/shared";
import {
    TOTAL_QUESTIONS,
    SCORE_PER_CORRECT,
} from "@self-intro-quiz/shared";

// ============================================================
// ドメインエラー
// ============================================================

/** Quiz Context 固有のドメインエラー */
export class QuizDomainError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "QuizDomainError";
    }
}

// ============================================================
// QuizAggregate
// ============================================================

export class QuizAggregate {
    private quiz: Quiz;

    private constructor(quiz: Quiz) {
        this.quiz = quiz;
    }

    // ----------------------------------------------------------
    // ファクトリ
    // ----------------------------------------------------------

    /**
     * 新しい Quiz を AI 生成の問題セットで作成する。
     */
    static create(roomCode: string, questions: Question[]): QuizAggregate {
        const quiz: Quiz = {
            roomCode,
            questions,
            currentQuestionIndex: -1,
            timerEndsAt: null,
            answers: new Map(),
        };
        return new QuizAggregate(quiz);
    }

    /**
     * 既存の Quiz データから Aggregate を復元する。
     */
    static fromQuiz(quiz: Quiz): QuizAggregate {
        return new QuizAggregate(quiz);
    }

    // ----------------------------------------------------------
    // クイズ進行
    // ----------------------------------------------------------

    /**
     * 最初の問題を開始する。
     *
     * @param timerEndsAt - タイマー終了時刻 (Unix timestamp ms)
     * @param totalParticipants - 回答可能な参加者数
     * @returns 問題開始ペイロード
     */
    start(timerEndsAt: number, totalParticipants: number): QuestionStartPayload {
        this.quiz.currentQuestionIndex = 0;
        this.quiz.timerEndsAt = timerEndsAt;

        const question = this.quiz.questions[0];
        if (!question) {
            throw new QuizDomainError("NO_QUESTIONS", "問題がセットされていません");
        }

        return {
            index: 0,
            text: question.text,
            choices: question.choices,
            timerEndsAt,
            totalParticipants,
        };
    }

    /**
     * 次の問題に進む。
     *
     * @param timerEndsAt - タイマー終了時刻
     * @param totalParticipants - 回答可能な参加者数
     * @returns 問題開始ペイロード。全問終了なら null
     */
    nextQuestion(timerEndsAt: number, totalParticipants: number): QuestionStartPayload | null {
        const nextIndex = this.quiz.currentQuestionIndex + 1;
        if (nextIndex >= TOTAL_QUESTIONS) {
            return null; // 全問終了
        }

        this.quiz.currentQuestionIndex = nextIndex;
        this.quiz.timerEndsAt = timerEndsAt;

        const question = this.quiz.questions[nextIndex];
        if (!question) {
            return null;
        }

        return {
            index: nextIndex,
            text: question.text,
            choices: question.choices,
            timerEndsAt,
            totalParticipants,
        };
    }

    // ----------------------------------------------------------
    // 回答処理
    // ----------------------------------------------------------

    /**
     * 参加者の回答を記録する。
     *
     * @throws QuizDomainError ALREADY_ANSWERED / QUESTION_CLOSED
     */
    submitAnswer(participantId: string, choiceIndex: number): Answer {
        const currentIndex = this.quiz.currentQuestionIndex;
        const question = this.quiz.questions[currentIndex];
        if (!question) {
            throw new QuizDomainError("QUESTION_CLOSED", "現在回答可能な問題がありません");
        }

        // 既回答チェック
        const existingAnswers = this.quiz.answers.get(participantId) ?? [];
        if (existingAnswers.some((a) => a.questionIndex === currentIndex)) {
            throw new QuizDomainError("ALREADY_ANSWERED", "この問題には既に回答済みです");
        }

        const answer: Answer = {
            participantId,
            questionIndex: currentIndex,
            choiceIndex,
            isCorrect: choiceIndex === question.correctIndex,
            answeredAt: Date.now(),
        };

        if (!this.quiz.answers.has(participantId)) {
            this.quiz.answers.set(participantId, []);
        }
        this.quiz.answers.get(participantId)!.push(answer);

        return answer;
    }

    /**
     * 参加者がこの問題に回答可能か判定する。
     * 途中参加者は joinedAtQuestion 以降の問題のみ回答可能。
     */
    canAnswer(participantId: string, questionIndex: number, joinedAtQuestion: number): boolean {
        // 途中参加者は joinedAtQuestion 以降のみ回答可能
        if (joinedAtQuestion > questionIndex) {
            return false;
        }

        // 既回答チェック
        const existingAnswers = this.quiz.answers.get(participantId) ?? [];
        return !existingAnswers.some((a) => a.questionIndex === questionIndex);
    }

    /**
     * 回答可能な参加者が全員回答したか。
     *
     * @param eligibleCount - 回答可能な参加者数
     */
    allAnswered(eligibleCount: number): boolean {
        const currentIndex = this.quiz.currentQuestionIndex;
        let answeredCount = 0;

        for (const answers of this.quiz.answers.values()) {
            if (answers.some((a) => a.questionIndex === currentIndex)) {
                answeredCount++;
            }
        }

        return answeredCount >= eligibleCount;
    }

    /**
     * タイムアウト時に未回答者に対して choiceIndex = -1 の Answer を記録する。
     */
    recordTimeouts(eligibleParticipantIds: string[]): void {
        const currentIndex = this.quiz.currentQuestionIndex;

        for (const participantId of eligibleParticipantIds) {
            const existingAnswers = this.quiz.answers.get(participantId) ?? [];
            const hasAnswered = existingAnswers.some((a) => a.questionIndex === currentIndex);

            if (!hasAnswered) {
                const answer: Answer = {
                    participantId,
                    questionIndex: currentIndex,
                    choiceIndex: -1,
                    isCorrect: false,
                    answeredAt: Date.now(),
                };

                if (!this.quiz.answers.has(participantId)) {
                    this.quiz.answers.set(participantId, []);
                }
                this.quiz.answers.get(participantId)!.push(answer);
            }
        }
    }

    // ----------------------------------------------------------
    // 結果
    // ----------------------------------------------------------

    /**
     * 現在の問題の正解を発表する。
     *
     * @param participants - スコア計算用の参加者Map
     * @returns 正解発表ペイロード
     */
    reveal(participants: Map<string, Participant>): QuestionRevealPayload {
        const currentIndex = this.quiz.currentQuestionIndex;
        const question = this.quiz.questions[currentIndex];
        if (!question) {
            throw new QuizDomainError("NO_CURRENT_QUESTION", "現在の問題がありません");
        }

        this.quiz.timerEndsAt = null;

        return {
            questionIndex: currentIndex,
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            scores: this.computeScoreboard(participants),
        };
    }

    /**
     * 全参加者のスコアボードを計算する。
     */
    computeScoreboard(participants: Map<string, Participant>): ScoreEntry[] {
        const entries: ScoreEntry[] = [];

        for (const [participantId, participant] of participants) {
            const answers = this.quiz.answers.get(participantId) ?? [];
            const correctCount = answers.filter((a) => a.isCorrect).length;
            const answeredCount = answers.filter((a) => a.choiceIndex !== -1).length;

            // この参加者が回答可能だった問題数
            const totalQuestions =
                participant.joinedAtQuestion === -1
                    ? this.quiz.currentQuestionIndex + 1
                    : Math.max(0, this.quiz.currentQuestionIndex + 1 - participant.joinedAtQuestion);

            entries.push({
                nickname: participant.nickname,
                score: correctCount * SCORE_PER_CORRECT,
                correctCount,
                answeredCount,
                totalQuestions,
                isLateJoiner: participant.joinedAtQuestion > 0,
                rank: 0, // 後で設定
            });
        }

        // ランキング（スコア降順 → 正解率降順）
        entries.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const rateA = a.totalQuestions > 0 ? a.correctCount / a.totalQuestions : 0;
            const rateB = b.totalQuestions > 0 ? b.correctCount / b.totalQuestions : 0;
            return rateB - rateA;
        });

        // 同点は同じ順位
        let currentRank = 1;
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i]!;
            if (i > 0 && entry.score === entries[i - 1]!.score) {
                entry.rank = entries[i - 1]!.rank;
            } else {
                entry.rank = currentRank;
            }
            currentRank++;
        }

        return entries;
    }

    // ----------------------------------------------------------
    // クエリ
    // ----------------------------------------------------------

    /** 現在の問題の回答済み人数 */
    getAnsweredCount(): number {
        const currentIndex = this.quiz.currentQuestionIndex;
        let count = 0;
        for (const answers of this.quiz.answers.values()) {
            if (answers.some((a) => a.questionIndex === currentIndex)) {
                count++;
            }
        }
        return count;
    }

    /**
     * 現在の問題に回答済みの参加者 ID 一覧を返す。
     * 回答状況の per-participant 表示に使用する。
     */
    getAnsweredParticipantIds(): string[] {
        const currentIndex = this.quiz.currentQuestionIndex;
        const ids: string[] = [];
        for (const [participantId, answers] of this.quiz.answers.entries()) {
            if (answers.some((a) => a.questionIndex === currentIndex)) {
                ids.push(participantId);
            }
        }
        return ids;
    }

    /** 現在の問題番号 */
    get currentQuestionIndex(): number {
        return this.quiz.currentQuestionIndex;
    }

    /** ルームコード */
    get roomCode(): string {
        return this.quiz.roomCode;
    }

    /** 全問終了したか */
    get isFinished(): boolean {
        return this.quiz.currentQuestionIndex >= TOTAL_QUESTIONS - 1;
    }

    /** 現在の問題 */
    get currentQuestion(): Question | undefined {
        return this.quiz.questions[this.quiz.currentQuestionIndex];
    }

    /** Quiz データのスナップショットを返す */
    toQuiz(): Quiz {
        return this.quiz;
    }
}
