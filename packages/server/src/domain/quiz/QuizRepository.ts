/**
 * QuizRepository — Quiz Aggregate の永続化ポート
 *
 * Quiz Context のドメイン層に配置。
 * Infrastructure 層の InMemoryQuizRepository が実装する。
 */

import type { Quiz } from "@self-intro-quiz/shared";

/**
 * Quiz の永続化を抽象化するポートインターフェース。
 * MVP ではインメモリ実装を使用。
 */
export interface QuizRepository {
    /** クイズを保存（作成・更新兼用） */
    save(quiz: Quiz): void;

    /** ルームコードでクイズを検索。見つからなければ undefined */
    findByRoomCode(code: string): Quiz | undefined;

    /** クイズを削除 */
    delete(code: string): void;
}
