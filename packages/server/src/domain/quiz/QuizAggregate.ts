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
    QuizHighlight,
    QuestionStartPayload,
    QuestionRevealPayload,
    ParticipantAnswerResult,
    QuestionResultSummary,
} from "@self-intro-quiz/shared";
import {
    BASE_CORRECT_SCORE,
    MAX_SPEED_BONUS,
    STREAK_MULTIPLIERS,
    CURIOUS_VOTE_THRESHOLD,
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
            questionStartedAt: null,
            answers: new Map(),
            curiousVotes: new Map(),
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
        this.quiz.questionStartedAt = Date.now();

        const question = this.quiz.questions[0];
        if (!question) {
            throw new QuizDomainError("NO_QUESTIONS", "問題がセットされていません");
        }

        return {
            index: 0,
            questionType: question.questionType,
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
        if (nextIndex >= this.quiz.questions.length) {
            return null; // 全問終了
        }

        this.quiz.currentQuestionIndex = nextIndex;
        this.quiz.timerEndsAt = timerEndsAt;
        this.quiz.questionStartedAt = Date.now();

        const question = this.quiz.questions[nextIndex];
        if (!question) {
            return null;
        }

        return {
            index: nextIndex,
            questionType: question.questionType,
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

        const now = Date.now();
        const isCorrect = choiceIndex === question.correctIndex;

        // 残り時間を計算（スピードボーナス用）
        const remainingMs = this.quiz.timerEndsAt
            ? Math.max(0, this.quiz.timerEndsAt - now)
            : 0;

        // 連続正解数を計算
        const streakCount = isCorrect ? this.computeCurrentStreak(existingAnswers) + 1 : 0;

        // スコア計算: 正解時のみポイント付与
        const earnedScore = isCorrect
            ? this.calculateScore(remainingMs, streakCount)
            : 0;

        const answer: Answer = {
            participantId,
            questionIndex: currentIndex,
            choiceIndex,
            isCorrect,
            answeredAt: now,
            earnedScore,
            remainingMs,
            streakCount,
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
                    earnedScore: 0,
                    remainingMs: 0,
                    streakCount: 0,
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
            participantResults: this.computeParticipantResults(currentIndex, participants),
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

            // earnedScore の合計がスコア（スピードボーナス + ストリーク倍率込み）
            const score = answers.reduce((sum, a) => sum + a.earnedScore, 0);

            // 最長連続正解数
            const maxStreak = this.computeMaxStreak(answers);

            entries.push({
                nickname: participant.nickname,
                score,
                correctCount,
                answeredCount,
                totalQuestions,
                isLateJoiner: participant.joinedAtQuestion > 0,
                rank: 0, // 後で設定
                maxStreak,
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

    /** 総問題数 */
    get totalQuestions(): number {
        return this.quiz.questions.length;
    }

    /** 全問終了したか */
    get isFinished(): boolean {
        return this.quiz.currentQuestionIndex >= this.quiz.questions.length - 1;
    }

    /** 現在の問題 */
    get currentQuestion(): Question | undefined {
        return this.quiz.questions[this.quiz.currentQuestionIndex];
    }

    /** 現在の問題の対象者 participantId を返す。未開始なら undefined */
    get currentSubjectId(): string | undefined {
        return this.currentQuestion?.subjectId;
    }

    // ----------------------------------------------------------
    // 「気になる」投票
    // ----------------------------------------------------------

    /**
     * 参加者が現在の問題の対象者に「気になる」投票する。
     * 重複投票は無視（Set で管理）。
     */
    voteCurious(participantId: string, questionIndex: number): void {
        if (questionIndex !== this.quiz.currentQuestionIndex) {
            throw new QuizDomainError("QUESTION_CLOSED", "この問題は既に終了しています");
        }
        if (!this.quiz.curiousVotes.has(questionIndex)) {
            this.quiz.curiousVotes.set(questionIndex, new Set());
        }
        this.quiz.curiousVotes.get(questionIndex)!.add(participantId);
    }

    /**
     * 現在の問題の「気になる」投票数が閾値以上か判定する。
     *
     * @param eligibleCount - 投票可能な参加者数
     * @returns true ならスピーチ発動
     */
    hasCuriousThreshold(eligibleCount: number): boolean {
        const votes = this.quiz.curiousVotes.get(this.quiz.currentQuestionIndex);
        const voteCount = votes ? votes.size : 0;
        return eligibleCount > 0 && voteCount / eligibleCount >= CURIOUS_VOTE_THRESHOLD;
    }

    /**
     * 参加者が現在の問題で既に「気になる」投票済みか判定する。
     */
    hasVotedCurious(participantId: string, questionIndex: number): boolean {
        const votes = this.quiz.curiousVotes.get(questionIndex);
        return votes ? votes.has(participantId) : false;
    }

    // ----------------------------------------------------------
    // 参加者ごとの回答結果
    // ----------------------------------------------------------

    /**
     * 指定した問題の参加者ごとの回答結果を算出する。
     * 途中参加者は joinedAtQuestion より前の問題では isIneligible = true。
     * タイムアウト（choiceIndex === -1）は isTimeout = true。
     */
    computeParticipantResults(
        questionIndex: number,
        participants: Map<string, Participant>,
    ): ParticipantAnswerResult[] {
        const results: ParticipantAnswerResult[] = [];

        for (const [participantId, participant] of participants) {
            const isIneligible =
                participant.joinedAtQuestion !== -1 &&
                participant.joinedAtQuestion > questionIndex;

            if (isIneligible) {
                results.push({
                    nickname: participant.nickname,
                    isCorrect: false,
                    isTimeout: false,
                    isIneligible: true,
                    choiceIndex: -1,
                    earnedScore: 0,
                    streakCount: 0,
                });
                continue;
            }

            const answers = this.quiz.answers.get(participantId) ?? [];
            const answer = answers.find((a) => a.questionIndex === questionIndex);

            if (!answer) {
                // 回答レコードがない（回答前の時点で呼ばれた場合など）
                results.push({
                    nickname: participant.nickname,
                    isCorrect: false,
                    isTimeout: false,
                    isIneligible: false,
                    choiceIndex: -1,
                    earnedScore: 0,
                    streakCount: 0,
                });
                continue;
            }

            results.push({
                nickname: participant.nickname,
                isCorrect: answer.isCorrect,
                isTimeout: answer.choiceIndex === -1,
                isIneligible: false,
                choiceIndex: answer.choiceIndex,
                earnedScore: answer.earnedScore,
                streakCount: answer.streakCount,
            });
        }

        return results;
    }

    /**
     * 全問題の回答結果サマリーを算出する。
     * 結果画面での一覧表示に使用。
     */
    computeAllQuestionResults(
        participants: Map<string, Participant>,
    ): QuestionResultSummary[] {
        return this.quiz.questions.map((question, qi) => ({
            questionIndex: qi,
            text: question.text,
            correctIndex: question.correctIndex,
            choices: question.choices,
            participantResults: this.computeParticipantResults(qi, participants),
        }));
    }

    // ----------------------------------------------------------
    // ハイライト計算
    // ----------------------------------------------------------

    /**
     * クイズ終了後のハイライト情報を計算する。
     * 全問終了後に呼び出し、結果画面に表示する盛り上がりポイントを抽出する。
     */
    computeHighlights(participants: Map<string, Participant>): QuizHighlight[] {
        const highlights: QuizHighlight[] = [];

        // --- 全問正解（パーフェクト） ---
        const perfectScorers = this.findPerfectScorers(participants);
        if (perfectScorers.length > 0) {
            highlights.push({
                emoji: "🎯",
                title: "パーフェクト！",
                description:
                    perfectScorers.length === 1
                        ? `${perfectScorers[0]} さんが全問正解を達成！`
                        : `${perfectScorers.join("、")} さんが全問正解を達成！`,
            });
        }

        // --- スピードスター（最速平均回答者） ---
        const speedStar = this.findSpeedStar(participants);
        if (speedStar) {
            highlights.push({
                emoji: "⚡",
                title: "スピードスター",
                description: `${speedStar.nickname} さんが最速！平均 ${speedStar.avgSeconds} 秒で回答`,
            });
        }

        // --- 連続正解王 ---
        const streakKing = this.findStreakKing(participants);
        if (streakKing && streakKing.streak >= 3) {
            highlights.push({
                emoji: "🔥",
                title: "連続正解王",
                description: `${streakKing.nickname} さんが ${streakKing.streak} 問連続正解！`,
            });
        }

        // --- 最難問 ---
        const hardest = this.findHardestQuestion(participants);
        if (hardest) {
            highlights.push({
                emoji: "😱",
                title: "最難問",
                description: `Q${hardest.questionNumber}「${hardest.questionText}」— 正答率 ${hardest.correctRate}%`,
            });
        }

        // --- 気になる大賞 ---
        const mostCurious = this.findMostCuriousQuestion();
        if (mostCurious) {
            highlights.push({
                emoji: "🤔",
                title: "気になる大賞",
                description: `Q${mostCurious.questionNumber}「${mostCurious.questionText}」に ${mostCurious.voteCount} 票の「気になる！」`,
            });
        }

        return highlights;
    }

    /**
     * 全問正解の参加者ニックネーム一覧を返す。
     * 途中参加者は回答可能だった問題を全問正解していればパーフェクト扱い。
     */
    private findPerfectScorers(participants: Map<string, Participant>): string[] {
        const result: string[] = [];
        for (const [participantId, participant] of participants) {
            const answers = this.quiz.answers.get(participantId) ?? [];
            const eligibleQuestions =
                participant.joinedAtQuestion === -1
                    ? this.quiz.questions.length
                    : Math.max(0, this.quiz.questions.length - participant.joinedAtQuestion);
            if (eligibleQuestions === 0) continue;

            const correctCount = answers.filter((a) => a.isCorrect).length;
            if (correctCount === eligibleQuestions) {
                result.push(participant.nickname);
            }
        }
        return result;
    }

    /**
     * 最速平均回答時間の参加者を見つける。
     * タイムアウト未回答（choiceIndex === -1）は除外して計算する。
     */
    private findSpeedStar(
        participants: Map<string, Participant>,
    ): { nickname: string; avgSeconds: number } | null {
        let fastest: { nickname: string; avgMs: number } | null = null;

        for (const [participantId, participant] of participants) {
            const answers = this.quiz.answers.get(participantId) ?? [];
            // 実際に回答した（タイムアウトでない）回答のみ
            const validAnswers = answers.filter((a) => a.choiceIndex !== -1);
            if (validAnswers.length < 2) continue; // 少なすぎる場合はスキップ

            // 問題ごとの開始時刻が直接取れないため、同じ問題の全回答者の中で最も早い回答を基準にする
            let totalRelativeMs = 0;
            let measuredCount = 0;
            for (const answer of validAnswers) {
                const allAnswersForQuestion: Answer[] = [];
                for (const answers2 of this.quiz.answers.values()) {
                    const a = answers2.find(
                        (a2) => a2.questionIndex === answer.questionIndex && a2.choiceIndex !== -1,
                    );
                    if (a) allAnswersForQuestion.push(a);
                }
                if (allAnswersForQuestion.length < 2) continue;

                const earliest = Math.min(...allAnswersForQuestion.map((a) => a.answeredAt));
                const latest = Math.max(...allAnswersForQuestion.map((a) => a.answeredAt));
                if (latest === earliest) continue; // 全員同時なら差がない

                totalRelativeMs += answer.answeredAt - earliest;
                measuredCount++;
            }

            if (measuredCount < 2) continue;

            const avgMs = totalRelativeMs / measuredCount;

            if (!fastest || avgMs < fastest.avgMs) {
                fastest = { nickname: participant.nickname, avgMs };
            }
        }

        if (!fastest) return null;

        // 表示用に秒に変換（小数点第1位）
        let avgSeconds = Math.round((fastest.avgMs / 1000) * 10) / 10;
        // avgSeconds が 0 の場合（常に最速回答）、0.0 秒と表示するのは不自然なので調整
        if (avgSeconds === 0) {
            avgSeconds = 0.1; // 「ほぼ最速」として表示
        }

        return { nickname: fastest.nickname, avgSeconds };
    }

    /**
     * 最長連続正解記録を持つ参加者を見つける。
     */
    private findStreakKing(
        participants: Map<string, Participant>,
    ): { nickname: string; streak: number } | null {
        let best: { nickname: string; streak: number } | null = null;

        for (const [participantId, participant] of participants) {
            const answers = this.quiz.answers.get(participantId) ?? [];
            // 問題番号順にソート
            const sorted = [...answers].sort((a, b) => a.questionIndex - b.questionIndex);

            let currentStreak = 0;
            let maxStreak = 0;

            for (const answer of sorted) {
                if (answer.isCorrect) {
                    currentStreak++;
                    maxStreak = Math.max(maxStreak, currentStreak);
                } else {
                    currentStreak = 0;
                }
            }

            if (!best || maxStreak > best.streak) {
                best = { nickname: participant.nickname, streak: maxStreak };
            }
        }

        return best;
    }

    /**
     * 最も正答率が低い問題を見つける。
     */
    private findHardestQuestion(
        participants: Map<string, Participant>,
    ): { questionNumber: number; questionText: string; correctRate: number } | null {
        if (this.quiz.questions.length === 0) return null;

        let hardest: { questionNumber: number; questionText: string; correctRate: number } | null =
            null;

        for (let qi = 0; qi < this.quiz.questions.length; qi++) {
            const question = this.quiz.questions[qi]!;
            let correct = 0;
            let total = 0;

            for (const [participantId, participant] of participants) {
                // 途中参加者はその問題に回答できなかった場合スキップ
                if (participant.joinedAtQuestion > qi) continue;

                const answer = (this.quiz.answers.get(participantId) ?? []).find(
                    (a) => a.questionIndex === qi,
                );
                if (answer) {
                    total++;
                    if (answer.isCorrect) correct++;
                }
            }

            if (total === 0) continue;

            const correctRate = Math.round((correct / total) * 100);
            // 問題文が30文字を超える場合は省略
            const questionText =
                question.text.length > 30
                    ? question.text.slice(0, 30) + "…"
                    : question.text;

            if (!hardest || correctRate < hardest.correctRate) {
                hardest = { questionNumber: qi + 1, questionText, correctRate };
            }
        }

        return hardest;
    }

    /**
     * 最も「気になる」投票を集めた問題を見つける。
     */
    private findMostCuriousQuestion(): {
        questionNumber: number;
        questionText: string;
        voteCount: number;
    } | null {
        let best: { questionNumber: number; questionText: string; voteCount: number } | null =
            null;

        for (const [questionIndex, votes] of this.quiz.curiousVotes) {
            if (votes.size === 0) continue;

            const question = this.quiz.questions[questionIndex];
            if (!question) continue;

            const questionText =
                question.text.length > 30
                    ? question.text.slice(0, 30) + "…"
                    : question.text;

            if (!best || votes.size > best.voteCount) {
                best = {
                    questionNumber: questionIndex + 1,
                    questionText,
                    voteCount: votes.size,
                };
            }
        }

        return best;
    }

    // ----------------------------------------------------------
    // スコア計算ヘルパー
    // ----------------------------------------------------------

    /**
     * 1問分のスコアを計算する。
     * スコア = floor((BASE_CORRECT_SCORE + speedBonus) × streakMultiplier)
     */
    private calculateScore(remainingMs: number, streakCount: number): number {
        const timeLimit = this.getQuestionTimeLimit();
        const speedRatio = timeLimit > 0 ? Math.min(1, remainingMs / timeLimit) : 0;
        const baseWithSpeed = BASE_CORRECT_SCORE + MAX_SPEED_BONUS * speedRatio;
        const multiplier = this.getStreakMultiplier(streakCount);
        return Math.floor(baseWithSpeed * multiplier);
    }

    /**
     * 現在の問題の制限時間（ms）を算出する。
     * questionStartedAt と timerEndsAt の差から逆算する。
     */
    private getQuestionTimeLimit(): number {
        if (this.quiz.questionStartedAt && this.quiz.timerEndsAt) {
            return this.quiz.timerEndsAt - this.quiz.questionStartedAt;
        }
        return 0;
    }

    /**
     * ストリーク倍率を返す。
     * STREAK_MULTIPLIERS テーブルの範囲外（5連続以上）は最大倍率で固定。
     */
    private getStreakMultiplier(streakCount: number): number {
        if (streakCount <= 0) return 1.0;
        if (streakCount >= STREAK_MULTIPLIERS.length) {
            return STREAK_MULTIPLIERS[STREAK_MULTIPLIERS.length - 1]!;
        }
        return STREAK_MULTIPLIERS[streakCount] ?? 1.0;
    }

    /**
     * 既存の回答配列から、直近の連続正解数を計算する。
     * 問題番号順にソートし、最新の連続正解を数える。
     */
    private computeCurrentStreak(existingAnswers: Answer[]): number {
        if (existingAnswers.length === 0) return 0;

        const sorted = [...existingAnswers].sort((a, b) => a.questionIndex - b.questionIndex);
        let streak = 0;
        // 末尾から逆順に連続正解を数える
        for (let i = sorted.length - 1; i >= 0; i--) {
            if (sorted[i]!.isCorrect) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * 回答配列からの最長連続正解数を計算する。
     */
    private computeMaxStreak(answers: Answer[]): number {
        if (answers.length === 0) return 0;

        const sorted = [...answers].sort((a, b) => a.questionIndex - b.questionIndex);
        let currentStreak = 0;
        let maxStreak = 0;
        for (const answer of sorted) {
            if (answer.isCorrect) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        return maxStreak;
    }

    /** Quiz データのスナップショットを返す */
    toQuiz(): Quiz {
        return this.quiz;
    }
}
