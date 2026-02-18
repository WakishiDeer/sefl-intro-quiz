/**
 * InMemoryQuizRepository — QuizRepository のインメモリ実装
 *
 * MVP 用。サーバ再起動で全データが消失する。
 */

import type { Quiz } from "@self-intro-quiz/shared";
import type { QuizRepository } from "../domain/quiz/QuizRepository.js";

export class InMemoryQuizRepository implements QuizRepository {
    private quizzes: Map<string, Quiz> = new Map();

    save(quiz: Quiz): void {
        this.quizzes.set(quiz.roomCode, quiz);
    }

    findByRoomCode(code: string): Quiz | undefined {
        return this.quizzes.get(code);
    }

    delete(code: string): void {
        this.quizzes.delete(code);
    }
}
