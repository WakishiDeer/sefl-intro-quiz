/**
 * broadcastRoomList.test.ts — broadcastRoomList ヘルパーのユニットテスト
 *
 * ルーム一覧ブロードキャスト関数の動作を検証する。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { broadcastRoomList } from "./roomHandlers.js";
import type { RoomRepository } from "../domain/room/RoomRepository.js";
import type { Room, RoomListPayload } from "@self-intro-quiz/shared";

// --- Mock: Socket.IO Server ---
function createMockIO() {
    const emitFn = vi.fn();
    const toFn = vi.fn().mockReturnValue({ emit: emitFn });
    return { to: toFn, emit: emitFn, _toFn: toFn, _emitFn: emitFn };
}

// --- Mock: RoomRepository ---
function createMockRoomRepo(rooms: Room[]): RoomRepository {
    const roomMap = new Map<string, Room>();
    for (const room of rooms) {
        roomMap.set(room.code, room);
    }

    return {
        save: vi.fn(),
        findByCode: vi.fn((code: string) => roomMap.get(code)),
        findAll: vi.fn(() => roomMap.entries()),
        has: vi.fn((code: string) => roomMap.has(code)),
        delete: vi.fn(),
        getActiveRoomCount: vi.fn(() => roomMap.size),
    };
}

// --- Helper: テスト用ルーム作成 ---
function makeRoom(
    code: string,
    phase: Room["phase"] = "lobby",
    participants: Array<{ id: string; nickname: string; isHost: boolean; isConnected: boolean }> = [],
): Room {
    const participantMap = new Map<string, Room["participants"] extends Map<string, infer V> ? V : never>();
    for (const p of participants) {
        participantMap.set(p.id, {
            id: p.id,
            nickname: p.nickname,
            socketId: `socket-${p.id}`,
            profile: null,
            isHost: p.isHost,
            joinedAtQuestion: -1,
            isConnected: p.isConnected,
            joinedAt: Date.now(),
        });
    }

    return {
        code,
        hostId: participants.find((p) => p.isHost)?.id ?? "",
        phase,
        participants: participantMap,
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        profileFields: [],
    };
}

describe("broadcastRoomList", () => {
    let mockIO: ReturnType<typeof createMockIO>;

    beforeEach(() => {
        mockIO = createMockIO();
    });

    it("ルームがない場合、空の rooms 配列をブロードキャストする", () => {
        const repo = createMockRoomRepo([]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastRoomList(mockIO as any, repo);

        expect(mockIO._toFn).toHaveBeenCalledWith("__room_list__");
        expect(mockIO._emitFn).toHaveBeenCalledWith("room:list", { rooms: [] });
    });

    it("ルーム一覧を正しいサマリー形式でブロードキャストする", () => {
        const room = makeRoom("ABC123", "lobby", [
            { id: "p1", nickname: "Alice", isHost: true, isConnected: true },
            { id: "p2", nickname: "Bob", isHost: false, isConnected: true },
        ]);
        const repo = createMockRoomRepo([room]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastRoomList(mockIO as any, repo);

        expect(mockIO._toFn).toHaveBeenCalledWith("__room_list__");

        const payload: RoomListPayload = mockIO._emitFn.mock.calls[0]?.[1] as RoomListPayload;
        expect(payload.rooms).toHaveLength(1);

        const summary = payload.rooms[0]!;
        expect(summary.code).toBe("ABC123");
        expect(summary.phase).toBe("lobby");
        expect(summary.hostNickname).toBe("Alice");
        expect(summary.participantCount).toBe(2);
        expect(summary.maxParticipants).toBe(20);
        expect(summary.participants).toEqual(
            expect.arrayContaining([
                { nickname: "Alice", isConnected: true },
                { nickname: "Bob", isConnected: true },
            ]),
        );
    });

    it("複数ルームを正しくブロードキャストする", () => {
        const room1 = makeRoom("ROOM01", "lobby", [
            { id: "p1", nickname: "Alice", isHost: true, isConnected: true },
        ]);
        const room2 = makeRoom("ROOM02", "playing", [
            { id: "p2", nickname: "Bob", isHost: true, isConnected: true },
            { id: "p3", nickname: "Carol", isHost: false, isConnected: false },
        ]);
        const repo = createMockRoomRepo([room1, room2]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastRoomList(mockIO as any, repo);

        const payload: RoomListPayload = mockIO._emitFn.mock.calls[0]?.[1] as RoomListPayload;
        expect(payload.rooms).toHaveLength(2);

        const codes = payload.rooms.map((r) => r.code);
        expect(codes).toContain("ROOM01");
        expect(codes).toContain("ROOM02");

        const room2Summary = payload.rooms.find((r) => r.code === "ROOM02")!;
        expect(room2Summary.phase).toBe("playing");
        expect(room2Summary.participants).toEqual(
            expect.arrayContaining([
                { nickname: "Bob", isConnected: true },
                { nickname: "Carol", isConnected: false },
            ]),
        );
    });

    it("切断中の参加者を isConnected: false で含める", () => {
        const room = makeRoom("XYZ789", "lobby", [
            { id: "p1", nickname: "Alice", isHost: true, isConnected: true },
            { id: "p2", nickname: "Bob", isHost: false, isConnected: false },
        ]);
        const repo = createMockRoomRepo([room]);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        broadcastRoomList(mockIO as any, repo);

        const payload: RoomListPayload = mockIO._emitFn.mock.calls[0]?.[1] as RoomListPayload;
        const bob = payload.rooms[0]!.participants.find((p) => p.nickname === "Bob");
        expect(bob?.isConnected).toBe(false);
    });
});
