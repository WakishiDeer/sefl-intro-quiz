/**
 * ProfileFieldSuggester — プロフィール項目提案ポート
 *
 * Room Context のドメイン層に配置。
 * 参加者のリクエストを集約して、AI にプロフィール項目を提案させる。
 * Infrastructure 層の AzureOpenAIProfileFieldSuggester / StubProfileFieldSuggester が実装する。
 */

import type { ProfileFieldDefinition } from "@self-intro-quiz/shared";

/** 参加者が送信した AI リクエストの入力情報 */
export interface AIRequestInput {
    /** プリセットから選択されたリクエスト（0個以上） */
    presets: string[];
    /** 自由記述テキスト */
    freeText: string;
}

/**
 * AI を使ったプロフィール項目提案を抽象化するポートインターフェース。
 * テスト時は MockProfileFieldSuggester に差し替え可能。
 */
export interface ProfileFieldSuggester {
    /**
     * 参加者のリクエストと現在の項目定義から、新しい項目セットを提案する。
     *
     * @param requests - 参加者全員のリクエスト（プリセット + 自由テキスト）
     * @param currentFields - 現在のプロフィール項目定義
     * @returns 提案された項目定義（1〜10個）
     */
    suggest(
        requests: AIRequestInput[],
        currentFields: ProfileFieldDefinition[],
    ): Promise<ProfileFieldDefinition[]>;
}
