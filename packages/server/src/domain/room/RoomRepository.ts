/**
 * RoomRepository — Room Aggregate の永続化ポート
 *
 * Room Context のドメイン層に配置。
 * Infrastructure 層の InMemoryRoomRepository が実装する。
 */

import type { Room } from "@self-intro-quiz/shared";

/**
 * Room の永続化を抽象化するポートインターフェース。
 * MVP ではインメモリ実装を使用し、将来 Redis 等に差し替え可能。
 */
export interface RoomRepository {
    /** ルームを保存（作成・更新兼用） */
    save(room: Room): void;

    /** ルームコードでルームを検索。見つからなければ undefined */
    findByCode(code: string): Room | undefined;

    /** ルームを削除 */
    delete(code: string): void;

    /** ルームコードが存在するか */
    has(code: string): boolean;

    /** 全ルームを走査するイテレータ */
    findAll(): IterableIterator<[string, Room]>;

    /** アクティブなルーム数 */
    getActiveRoomCount(): number;
}
