/**
 * StubQuizGenerator — QuizGenerator の固定値スタブ実装
 *
 * AI を使わず、参加者情報から決定論的にクイズを生成する。
 * `AI_PROVIDER=no-ai` で起動した場合に DI される。
 * API キー不要で動作するため、AI コスト無しで UI の動作確認が可能。
 */

import type { ProfileFieldDefinition, Question, QuestionType } from "@self-intro-quiz/shared";
import type { QuizCountConfig } from "@self-intro-quiz/shared";
import {
    YES_NO_CHOICES,
} from "@self-intro-quiz/shared";
import type { ParticipantProfile, QuizGenerator } from "../domain/quiz/QuizGenerator.js";
import { logger } from "../utils/logger.js";

/**
 * AI 不使用のスタブクイズ生成器。
 * 参加者のプロフィール情報を元に、テンプレートベースでクイズを生成する。
 */
export class StubQuizGenerator implements QuizGenerator {
    /**
     * 参加者プロフィールから固定テンプレートでクイズを生成する。
     * AI API を呼び出さないため即座に結果を返す。
     */
    async generate(
        participants: ParticipantProfile[],
        profileFields: ProfileFieldDefinition[],
        quizConfig: QuizCountConfig,
    ): Promise<Question[]> {
        logger.info(
            { participantCount: participants.length, totalQuestions: quizConfig.totalQuestions, mode: "stub" },
            "Generating quiz with stub (no AI)",
        );

        const questions: Question[] = [];

        // 4択問題を生成（パターンA「〜は誰？」とパターンB「〜さんの◯◯はどれ？」を交互に）
        for (let i = 0; i < quizConfig.fourChoiceCount; i++) {
            if (i % 2 === 0) {
                questions.push(
                    this.buildFourChoiceQuestion(i, participants, profileFields),
                );
            } else {
                questions.push(
                    this.buildFourChoiceAboutQuestion(i, participants, profileFields),
                );
            }
        }

        // ⭕❌問題を生成
        for (let i = 0; i < quizConfig.yesNoCount; i++) {
            const index = quizConfig.fourChoiceCount + i;
            questions.push(
                this.buildYesNoQuestion(index, participants, profileFields),
            );
        }

        logger.info(
            { questionCount: questions.length, mode: "stub" },
            "Stub quiz generation completed",
        );

        return questions;
    }

    /**
     * 4択問題を生成する。
     * 参加者のプロフィール値を正解として、他の参加者名を不正解選択肢にする。
     */
    private buildFourChoiceQuestion(
        index: number,
        participants: ParticipantProfile[],
        profileFields: ProfileFieldDefinition[],
    ): Question {
        // 対象参加者をローテーションで選ぶ
        const subject = participants[index % participants.length]!;
        // 使用するプロフィール項目をローテーション
        const field = profileFields[index % profileFields.length]!;
        const profileValue = subject.profile[field.id] ?? "（未入力）";

        // 選択肢: 全参加者名をシャッフルし、正解を含む4つを選ぶ
        const otherNames = participants
            .filter((p) => p.id !== subject.id)
            .map((p) => p.nickname);

        // 最大3人の不正解候補を選択
        const wrongChoices = otherNames.slice(0, 3);
        // 4人未満の場合はダミーで埋める
        while (wrongChoices.length < 3) {
            wrongChoices.push(`ダミー${wrongChoices.length + 1}`);
        }

        // 正解位置を固定的に決定（index を使って分散）
        const correctIndex = index % 4;
        const choices = [...wrongChoices];
        choices.splice(correctIndex, 0, subject.nickname);

        return {
            index,
            questionType: "four-choice" as QuestionType,
            text: `「${field.label}」が「${profileValue}」なのは誰？`,
            choices,
            correctIndex,
            explanation: `${subject.nickname}さんの${field.label}は「${profileValue}」です。（スタブ生成）`,
            subjectId: subject.id,
        };
    }

    /**
     * 4択問題（パターンB）を生成する。
     * 「~~さんの◯◯はどれ？」形式で、選択肢はプロフィール値で構成する。
     */
    private buildFourChoiceAboutQuestion(
        index: number,
        participants: ParticipantProfile[],
        profileFields: ProfileFieldDefinition[],
    ): Question {
        const subject = participants[index % participants.length]!;
        const field = profileFields[index % profileFields.length]!;
        const correctValue = subject.profile[field.id] ?? "（未入力）";

        // 不正解選択肢: 他の参加者の同じフィールドの値を集める
        const otherValues = participants
            .filter((p) => p.id !== subject.id)
            .map((p) => p.profile[field.id] ?? "")
            .filter((v) => v.trim().length > 0 && v !== correctValue);

        // 重複を除去してから最大3つ選ぶ
        const uniqueOtherValues = [...new Set(otherValues)].slice(0, 3);

        // 足りない場合はダミー値で補完
        while (uniqueOtherValues.length < 3) {
            uniqueOtherValues.push(`ダミー${field.label}${uniqueOtherValues.length + 1}`);
        }

        const correctIndex = index % 4;
        const choices = [...uniqueOtherValues];
        choices.splice(correctIndex, 0, correctValue);

        return {
            index,
            questionType: "four-choice" as QuestionType,
            text: `${subject.nickname}さんの「${field.label}」はどれ？`,
            choices,
            correctIndex,
            explanation: `${subject.nickname}さんの${field.label}は「${correctValue}」です。（スタブ生成）`,
            subjectId: subject.id,
        };
    }

    /**
     * ⭕❌問題を生成する。
     * 参加者のプロフィール値が正しいかどうかを問う。
     */
    private buildYesNoQuestion(
        index: number,
        participants: ParticipantProfile[],
        profileFields: ProfileFieldDefinition[],
    ): Question {
        const subject = participants[index % participants.length]!;
        const field = profileFields[index % profileFields.length]!;
        const profileValue = subject.profile[field.id] ?? "（未入力）";

        // 偶数インデックスは正しい（⭕）、奇数は嘘の内容（❌）
        const isTrue = index % 2 === 0;

        return {
            index,
            questionType: "yes-no" as QuestionType,
            text: `${subject.nickname}さんの${field.label}は「${isTrue ? profileValue : "???"}」である。`,
            choices: [...YES_NO_CHOICES],
            correctIndex: isTrue ? 0 : 1,
            explanation: `${subject.nickname}さんの${field.label}は「${profileValue}」です。（スタブ生成）`,
            subjectId: subject.id,
        };
    }
}
