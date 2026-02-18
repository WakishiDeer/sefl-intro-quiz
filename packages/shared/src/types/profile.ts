/**
 * Profile — 自己紹介プロフィール（Value Object）
 *
 * Room Context に属する Value Object。参加者が入力する自己紹介情報。
 * 各フィールドは最大100文字。サーバ側で sanitize-html によるサニタイズを実施する。
 */

export interface Profile {
    /** 出身地 (max 100文字) */
    hometown: string;
    /** 趣味 (max 100文字) */
    hobbies: string;
    /** 特技 (max 100文字) */
    skills: string;
    /** 好きな食べ物 (max 100文字) */
    favoriteFood: string;
    /** 意外な事実 (max 100文字) */
    surprisingFact: string;
    /** 自由記述 (max 100文字) */
    freeText: string;
}
