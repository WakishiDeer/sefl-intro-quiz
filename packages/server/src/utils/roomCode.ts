/**
 * roomCode.ts — ルームコード生成ユーティリティ
 *
 * 紛らわしい文字（0, O, I, l, 1）を除外した英数字6文字のコードを生成する。
 * 32^6 ≒ 10億通り。同時利用想定規模では衝突確率は無視できる。
 */

import { ROOM_CODE_CHARSET, ROOM_CODE_LENGTH } from "@self-intro-quiz/shared";
import type { RoomRepository } from "../domain/room/RoomRepository.js";

/**
 * ユニークなルームコードを生成する。
 * 衝突時はリトライする（最大10回）。
 *
 * @param roomRepository - 既存ルームの存在チェック用
 * @returns 6文字の英数大文字ルームコード
 */
export function generateRoomCode(roomRepository: RoomRepository): string {
    const maxAttempts = 10;

    for (let i = 0; i < maxAttempts; i++) {
        const code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
            ROOM_CODE_CHARSET[Math.floor(Math.random() * ROOM_CODE_CHARSET.length)],
        ).join("");

        if (!roomRepository.has(code)) {
            return code;
        }
    }

    // 理論上到達しない（32^6 ≒ 10億通り）
    throw new Error("Failed to generate unique room code after maximum attempts");
}
