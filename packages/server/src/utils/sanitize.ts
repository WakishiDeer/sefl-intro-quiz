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
 * 動的フィールドに対応: Record<string, string> の各値をサニタイズ。
 */
export function sanitizeProfile(profile: Profile): Profile {
    const sanitized: Profile = {};
    for (const [key, value] of Object.entries(profile)) {
        sanitized[key] = sanitize(value);
    }
    return sanitized;
}
