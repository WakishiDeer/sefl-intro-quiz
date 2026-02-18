/**
 * InMemoryRoomRepository — RoomRepository のインメモリ実装
 *
 * MVP 用。サーバ再起動で全データが消失する。
 * 将来の Redis 移行時は RoomRepository インターフェースを満たす新クラスに差し替える。
 */

import type { Room } from "@self-intro-quiz/shared";
import type { RoomRepository } from "../domain/room/RoomRepository.js";

export class InMemoryRoomRepository implements RoomRepository {
    private rooms: Map<string, Room> = new Map();

    save(room: Room): void {
        this.rooms.set(room.code, room);
    }

    findByCode(code: string): Room | undefined {
        return this.rooms.get(code);
    }

    delete(code: string): void {
        this.rooms.delete(code);
    }

    has(code: string): boolean {
        return this.rooms.has(code);
    }

    findAll(): IterableIterator<[string, Room]> {
        return this.rooms.entries();
    }

    getActiveRoomCount(): number {
        return this.rooms.size;
    }
}
