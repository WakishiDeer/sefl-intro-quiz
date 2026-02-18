/**
 * Quiz Context — クイズ・問題・回答・スコアの型定義
 *
 * Quiz Bounded Context に属する型。クイズ生成・出題進行・回答受付・スコア計算に使用。
 */

// ============================================================
// Question — 問題（Value Object）
// ============================================================

/** AI が生成した4択問題 */
export interface Question {
    /** 問題番号 (0-9) */
    index: number;
    /** 問題文 */
    text: string;
    /** 選択肢（参加者名の配列、最大4つ） */
    choices: string[];
    /** 正解の選択肢インデックス (0-3) */
    correctIndex: number;
    /** 解説文（なぜその人が正解か） */
    explanation: string;
    /** この問題の対象となった参加者の ID */
    subjectId: string;
}

// ============================================================
// Answer — 回答（Value Object）
// ============================================================

/** 参加者の回答記録 */
export interface Answer {
    /** 回答した参加者の ID */
    participantId: string;
    /** 問題番号 (0-9) */
    questionIndex: number;
    /** 選択した選択肢インデックス (-1 = 時間切れ未回答) */
    choiceIndex: number;
    /** 正解かどうか */
    isCorrect: boolean;
    /** Unix timestamp (ms) */
    answeredAt: number;
}

// ============================================================
// ScoreEntry — スコアボード表示用（Value Object）
// ============================================================

/** スコアボードの1行分 */
export interface ScoreEntry {
    /** 参加者のニックネーム */
    nickname: string;
    /** スコア（正解数 × 100） */
    score: number;
    /** 正解数 */
    correctCount: number;
    /** 回答済み問題数 */
    answeredCount: number;
    /** この参加者が回答可能だった問題数 */
    totalQuestions: number;
    /** 途中参加者かどうか */
    isLateJoiner: boolean;
    /** 順位 */
    rank: number;
}

// ============================================================
// Quiz — クイズ集約（サーバ内部用DTO）
// ============================================================

/**
 * クイズの全状態。サーバ内部では QuizAggregate クラスが管理する。
 * この interface は Aggregate ↔ Repository 間のデータ受け渡しに使用。
 */
export interface Quiz {
    /** 対応する Room の code */
    roomCode: string;
    /** AI 生成後にセット（10問） */
    questions: Question[];
    /** 現在の問題番号 (0-9, -1 = 未開始) */
    currentQuestionIndex: number;
    /** タイマー終了時刻 Unix timestamp (ms)。null = タイマー未稼働 */
    timerEndsAt: number | null;
    /** key = participantId, value = その参加者の全回答 */
    answers: Map<string, Answer[]>;
}
