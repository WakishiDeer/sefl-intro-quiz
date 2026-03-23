/**
 * QuizGenerator — クイズ生成ポート
 *
 * Quiz Context のドメイン層に配置。
 * Infrastructure 層の AzureOpenAIQuizGenerator / StubQuizGenerator が実装する。
 */

import type { Profile, ProfileFieldDefinition, Question } from "@self-intro-quiz/shared";
import type { QuizCountConfig } from "@self-intro-quiz/shared";

/** クイズ生成に必要な参加者情報 */
export interface ParticipantProfile {
    id: string;
    nickname: string;
    profile: Profile;
}

/**
 * AI を使ったクイズ生成を抽象化するポートインターフェース。
 * テスト時は MockQuizGenerator に差し替え可能。
 */
export interface QuizGenerator {
    /**
     * 参加者プロフィールからクイズを生成する。
     *
     * @param participants - プロフィール入力済みの参加者一覧
     * @param profileFields - 現在のプロフィール項目定義（ラベル解決用）
     * @param quizConfig - 問題数の構成（総数・⭕❌問題数・4択問題数）
     */
    generate(
        participants: ParticipantProfile[],
        profileFields: ProfileFieldDefinition[],
        quizConfig: QuizCountConfig,
    ): Promise<Question[]>;
}
