/**
 * Quiz Context — クイズ・問題・回答・スコアの型定義
 *
 * Quiz Bounded Context に属する型。クイズ生成・出題進行・回答受付・スコア計算に使用。
 */

// ============================================================
// QuestionType — 問題形式
// ============================================================

/** 問題の形式: 4択 or ⭕❌2択 */
export type QuestionType = "four-choice" | "yes-no";

// ============================================================
// Question — 問題（Value Object）
// ============================================================

/** AI が生成したクイズ問題 */
export interface Question {
    /** 問題番号 (0 〜 totalQuestions-1) */
    index: number;
    /** 問題形式 */
    questionType: QuestionType;
    /** 問題文 */
    text: string;
    /** 選択肢（4択: 参加者名の配列、⭕❌: ["⭕ はい", "❌ いいえ"]） */
    choices: string[];
    /** 正解の選択肢インデックス (4択: 0-3, ⭕❌: 0 or 1) */
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
    /** 問題番号 (0 〜 totalQuestions-1, -1 = 時間切れ未回答) */
    questionIndex: number;
    /** 選択した選択肢インデックス (-1 = 時間切れ未回答) */
    choiceIndex: number;
    /** 正解かどうか */
    isCorrect: boolean;
    /** Unix timestamp (ms) */
    answeredAt: number;
    /** この回答で獲得したスコア（スピードボーナス + ストリーク倍率適用済み） */
    earnedScore: number;
    /** 回答時の残り時間 (ms)。スピードボーナス計算の元データ */
    remainingMs: number;
    /** この回答時点での連続正解数（0 = 不正解/タイムアウト） */
    streakCount: number;
}

// ============================================================
// ScoreEntry — スコアボード表示用（Value Object）
// ============================================================

/** スコアボードの1行分 */
export interface ScoreEntry {
    /** 参加者のニックネーム */
    nickname: string;
    /** スコア（各問題の earnedScore の合計） */
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
    /** 最長連続正解数 */
    maxStreak: number;
}

// ============================================================
// QuizHighlight — クイズハイライト（結果発表用）
// ============================================================

/** クイズ終了後に表示するハイライト情報 */
export interface QuizHighlight {
    /** 絵文字アイコン */
    emoji: string;
    /** ハイライトのタイトル（例: "全問正解！"） */
    title: string;
    /** ハイライトの説明文 */
    description: string;
}

// ============================================================
// ParticipantAnswerResult — 各問題における参加者の回答結果
// ============================================================

/**
 * 1問ごとの参加者の回答結果。
 * revealing フェーズおよび結果画面で「誰が正解・不正解か」を表示するために使用。
 * 途中参加・離脱を考慮し、回答不可だった参加者も含めて表現する。
 */
export interface ParticipantAnswerResult {
    /** 参加者のニックネーム */
    nickname: string;
    /** 正解かどうか（不参加・タイムアウトは false） */
    isCorrect: boolean;
    /** タイムアウト（時間切れ未回答）かどうか */
    isTimeout: boolean;
    /** この問題に回答資格がなかった（途中参加で問題開始前に参加していない） */
    isIneligible: boolean;
    /** 選択した選択肢インデックス (-1 = タイムアウト or 不参加) */
    choiceIndex: number;
    /** この問題で獲得したスコア */
    earnedScore: number;
    /** この問題時点での連続正解数 */
    streakCount: number;
}

// ============================================================
// QuestionResultSummary — 問題ごとの回答結果サマリー
// ============================================================

/**
 * 1問分の回答結果サマリー。
 * 最終結果画面で全問題の回答状況を一覧表示するために使用。
 */
export interface QuestionResultSummary {
    /** 問題番号 (0-based) */
    questionIndex: number;
    /** 問題文 */
    text: string;
    /** 正解の選択肢インデックス */
    correctIndex: number;
    /** 選択肢 */
    choices: string[];
    /** 各参加者の回答結果 */
    participantResults: ParticipantAnswerResult[];
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
    /** AI 生成後にセット（問題数は参加者数・プロフィール項目数により動的に決定） */
    questions: Question[];
    /** 現在の問題番号 (0 〜 totalQuestions-1, -1 = 未開始) */
    currentQuestionIndex: number;
    /** タイマー終了時刻 Unix timestamp (ms)。null = タイマー未稼働 */
    timerEndsAt: number | null;
    /** 現在の問題の出題開始時刻 Unix timestamp (ms)。スピードボーナス計算に使用 */
    questionStartedAt: number | null;
    /** key = participantId, value = その参加者の全回答 */
    answers: Map<string, Answer[]>;
    /** key = questionIndex, value = 投票した participantId の Set */
    curiousVotes: Map<number, Set<string>>;
}
