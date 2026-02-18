/**
 * sanitize.ts — 入力サニタイズユーティリティ
 *
 * ユーザー入力から HTML タグ・属性を除去し、XSS を防止する。
 * Profile の全フィールドに適用する。
 */

import sanitizeHtml from "sanitize-html";
import type { Profile } from "@self-intro-quiz/shared";

/**
 * 文字列から全ての HTML タグ・属性を除去し、前後の空白をトリムする。
 */
export function sanitize(input: string): string {
    return sanitizeHtml(input, {
        allowedTags: [],
        allowedAttributes: {},
    }).trim();
}

/**
 * Profile の全フィールドをサニタイズする。
 */
export function sanitizeProfile(profile: Profile): Profile {
    return {
        hometown: sanitize(profile.hometown),
        hobbies: sanitize(profile.hobbies),
        skills: sanitize(profile.skills),
        favoriteFood: sanitize(profile.favoriteFood),
        surprisingFact: sanitize(profile.surprisingFact),
        freeText: sanitize(profile.freeText),
    };
}
