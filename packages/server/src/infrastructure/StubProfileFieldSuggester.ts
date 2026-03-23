/**
 * StubProfileFieldSuggester — ProfileFieldSuggester の固定値スタブ実装
 *
 * AI を使わず、リクエスト内容に基づいて固定のプロフィール項目を返す。
 * `AI_PROVIDER=no-ai` で起動した場合に DI される。
 */

import type { ProfileFieldDefinition } from "@self-intro-quiz/shared";
import type {
    ProfileFieldSuggester,
    AIRequestInput,
} from "../domain/room/ProfileFieldSuggester.js";
import { logger } from "../utils/logger.js";

/**
 * スタブ用のプロフィール項目候補プール。
 * リクエスト数に応じてこの中から返却する。
 */
const STUB_FIELDS: ProfileFieldDefinition[] = [
    { id: "hometown", label: "出身地", placeholder: "例: 東京都" },
    { id: "hobbies", label: "趣味", placeholder: "例: 映画鑑賞、ジョギング" },
    { id: "skills", label: "特技", placeholder: "例: 料理、プログラミング" },
    { id: "favorite_food", label: "好きな食べ物", placeholder: "例: カレーライス" },
    { id: "surprising_fact", label: "意外な事実", placeholder: "例: 実は3カ国語話せます" },
    { id: "free_text", label: "自由記述", placeholder: "何でもどうぞ！" },
    { id: "favorite_music", label: "好きな音楽", placeholder: "例: J-POP、クラシック" },
    { id: "dream", label: "将来の夢", placeholder: "例: 世界一周" },
    { id: "pet", label: "ペット", placeholder: "例: 猫2匹" },
    { id: "morning_or_night", label: "朝型 or 夜型", placeholder: "例: 完全夜型です" },
];

/**
 * AI 不使用のスタブプロフィール項目提案器。
 * 固定のフィールドセットを返す。
 */
export class StubProfileFieldSuggester implements ProfileFieldSuggester {
    /**
     * 固定のプロフィール項目セットを返す。
     * AI API を呼び出さないため即座に結果を返す。
     */
    async suggest(
        requests: AIRequestInput[],
        currentFields: ProfileFieldDefinition[],
    ): Promise<ProfileFieldDefinition[]> {
        logger.info(
            { requestCount: requests.length, mode: "stub" },
            "Suggesting profile fields with stub (no AI)",
        );

        // 現在のフィールド ID を除外して、新しい項目を優先的に返す
        const currentIds = new Set(currentFields.map((f) => f.id));
        const newFields = STUB_FIELDS.filter((f) => !currentIds.has(f.id));
        const existingFields = STUB_FIELDS.filter((f) => currentIds.has(f.id));

        // 新しい項目を優先し、既存項目で埋める（最大6項目）
        const result = [...newFields, ...existingFields].slice(0, 6);

        logger.info(
            { fieldCount: result.length, mode: "stub" },
            "Stub profile field suggestion completed",
        );

        return result;
    }
}
