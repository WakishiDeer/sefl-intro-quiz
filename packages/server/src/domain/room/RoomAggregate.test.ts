/**
 * RoomAggregate.test.ts — RoomAggregate のユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RoomAggregate, RoomDomainError } from "./RoomAggregate.js";
import type { Profile, Room, ProfileFieldDefinition } from "@self-intro-quiz/shared";
import { MAX_PARTICIPANTS, DEFAULT_PROFILE_FIELDS, MIN_PROFILE_FIELDS, MAX_PROFILE_FIELDS, DEFAULT_ANIMATION_THEME } from "@self-intro-quiz/shared";

// ============================================================
// ヘルパー
// ============================================================

function createRoom(): RoomAggregate {
    return RoomAggregate.create("ABC123", "Alice", "socket-host");
}

/** デフォルトのプロフィール項目に合致するダミープロフィール */
const dummyProfile: Profile = {
    hometown: "Tokyo",
    hobbies: "Reading",
    skills: "TypeScript",
    favorite_food: "Sushi",
    surprising_fact: "I can juggle",
    free_text: "",
};

// ============================================================
// テスト
// ============================================================

describe("RoomAggregate", () => {
    let room: RoomAggregate;

    beforeEach(() => {
        room = createRoom();
    });

    // ----------------------------------------------------------
    // ファクトリ
    // ----------------------------------------------------------

    describe("create", () => {
        it("ルームコードが正しく設定される", () => {
            expect(room.code).toBe("ABC123");
        });

        it("フェーズが lobby で開始する", () => {
            expect(room.phase).toBe("lobby");
        });

        it("Host が最初の参加者として登録される", () => {
            expect(room.participantCount).toBe(1);
            const data = room.toRoom();
            const host = data.participants.get(data.hostId);
            expect(host).toBeDefined();
            expect(host!.nickname).toBe("Alice");
            expect(host!.isHost).toBe(true);
            expect(host!.isConnected).toBe(true);
        });
    });

    describe("fromRoom", () => {
        it("既存の Room データから復元できる", () => {
            const data = room.toRoom();
            const restored = RoomAggregate.fromRoom(data);
            expect(restored.code).toBe("ABC123");
            expect(restored.participantCount).toBe(1);
        });
    });

    // ----------------------------------------------------------
    // 参加者管理
    // ----------------------------------------------------------

    describe("addParticipant", () => {
        it("新しい参加者を追加できる", () => {
            const p = room.addParticipant("Bob", "socket-bob");
            expect(p.nickname).toBe("Bob");
            expect(p.isHost).toBe(false);
            expect(p.isConnected).toBe(true);
            expect(room.participantCount).toBe(2);
        });

        it("ニックネームが重複する場合、エラーをスローする", () => {
            expect(() => room.addParticipant("Alice", "socket-2")).toThrow(
                RoomDomainError,
            );
            try {
                room.addParticipant("Alice", "socket-2");
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("NICKNAME_TAKEN");
            }
        });

        it("大文字・小文字違いのニックネームも重複とみなす（case-insensitive）", () => {
            expect(() => room.addParticipant("alice", "socket-2")).toThrow(
                RoomDomainError,
            );
            try {
                room.addParticipant("ALICE", "socket-3");
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("NICKNAME_TAKEN");
            }
        });

        it("切断中の参加者と同名なら追加できる", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            // 同名で新規追加可能（切断中は重複対象外）
            const bob2 = room.addParticipant("Bob", "socket-bob2");
            expect(bob2.nickname).toBe("Bob");
        });

        it("MAX_PARTICIPANTS を超えるとエラーをスローする", () => {
            for (let i = 1; i < MAX_PARTICIPANTS; i++) {
                room.addParticipant(`User${i}`, `socket-${i}`);
            }
            expect(room.participantCount).toBe(MAX_PARTICIPANTS);
            try {
                room.addParticipant("Overflow", "socket-overflow");
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("ROOM_FULL");
            }
        });

        it("playing フェーズでの途中参加は joinedAtQuestion が設定される", () => {
            room.changePhase("playing");
            const p = room.addParticipant("Late", "socket-late", 3);
            expect(p.joinedAtQuestion).toBe(4); // 次の問題から回答可能
        });
    });

    describe("disconnectParticipant", () => {
        it("参加者を切断状態にする", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            const p = room.getParticipant(bob.id);
            expect(p?.isConnected).toBe(false);
        });

        it("存在しない ID でもエラーにならない", () => {
            expect(() => room.disconnectParticipant("nonexistent")).not.toThrow();
        });
    });

    describe("removeParticipant", () => {
        it("参加者を完全に削除する", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.removeParticipant(bob.id);
            expect(room.participantCount).toBe(1); // Host のみ
        });
    });

    describe("reconnectParticipant", () => {
        it("切断中の同名参加者を再接続する", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);

            const reconnected = room.reconnectParticipant("Bob", "socket-bob-new");
            expect(reconnected).not.toBeNull();
            expect(reconnected!.socketId).toBe("socket-bob-new");
            expect(reconnected!.isConnected).toBe(true);
        });

        it("大文字・小文字違いでも再接続できる（case-insensitive）", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);

            const reconnected = room.reconnectParticipant("bob", "socket-bob-new");
            expect(reconnected).not.toBeNull();
            expect(reconnected!.nickname).toBe("Bob"); // 元のニックネームが保持される
            expect(reconnected!.isConnected).toBe(true);
        });

        it("該当する切断中の参加者がいない場合 null を返す", () => {
            const result = room.reconnectParticipant("Nobody", "socket-x");
            expect(result).toBeNull();
        });
    });

    // ----------------------------------------------------------
    // プロフィール管理
    // ----------------------------------------------------------

    describe("updateProfile", () => {
        it("lobby フェーズでプロフィールを更新できる", () => {
            const data = room.toRoom();
            const hostId = data.hostId;
            room.updateProfile(hostId, dummyProfile);
            const host = room.getParticipant(hostId);
            expect(host?.profile).toEqual(dummyProfile);
        });

        it("lobby 以外のフェーズではエラーをスローする", () => {
            room.changePhase("playing");
            const data = room.toRoom();
            try {
                room.updateProfile(data.hostId, dummyProfile);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_PHASE");
            }
        });

        it("存在しない参加者 ID ではエラーをスローする", () => {
            try {
                room.updateProfile("nonexistent", dummyProfile);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("PARTICIPANT_NOT_FOUND");
            }
        });
    });

    // ----------------------------------------------------------
    // Host 管理
    // ----------------------------------------------------------

    describe("isHost", () => {
        it("Host の ID で true を返す", () => {
            const data = room.toRoom();
            expect(room.isHost(data.hostId)).toBe(true);
        });

        it("Host 以外の ID で false を返す", () => {
            expect(room.isHost("random-id")).toBe(false);
        });
    });

    describe("transferHost", () => {
        it("最も古い接続中の参加者に Host を移譲する", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const carol = room.addParticipant("Carol", "socket-carol");
            const data = room.toRoom();
            room.disconnectParticipant(data.hostId);

            const newHost = room.transferHost();
            expect(newHost).not.toBeNull();
            expect(newHost!.id).toBe(bob.id); // Bob の方が Carol より先に参加
            expect(newHost!.isHost).toBe(true);
        });

        it("移譲先がいない場合 null を返す", () => {
            const data = room.toRoom();
            room.disconnectParticipant(data.hostId);
            const newHost = room.transferHost();
            expect(newHost).toBeNull();
        });
    });

    // ----------------------------------------------------------
    // disconnectAndTransferHost
    // ----------------------------------------------------------

    describe("disconnectAndTransferHost", () => {
        it("ホストが切断した場合、最古参の接続中参加者にホストが移る", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.addParticipant("Carol", "socket-carol");
            const data = room.toRoom();

            const result = room.disconnectAndTransferHost(data.hostId);
            expect(result.newHost).not.toBeNull();
            expect(result.newHost!.id).toBe(bob.id);
            expect(result.newHost!.isHost).toBe(true);
            expect(result.roomEmpty).toBe(false);
            expect(room.isHost(bob.id)).toBe(true);
        });

        it("非ホストが切断した場合、ホストは変更されない", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const data = room.toRoom();

            const result = room.disconnectAndTransferHost(bob.id);
            expect(result.newHost).toBeNull();
            expect(result.roomEmpty).toBe(false);
            expect(room.isHost(data.hostId)).toBe(true);
        });

        it("ホスト以外に接続中参加者がいない場合、newHost: null & roomEmpty: true", () => {
            const data = room.toRoom();

            const result = room.disconnectAndTransferHost(data.hostId);
            expect(result.newHost).toBeNull();
            expect(result.roomEmpty).toBe(true);
        });

        it("最後の非ホスト参加者が切断した場合、roomEmpty: false（ホストはまだ接続中）", () => {
            const bob = room.addParticipant("Bob", "socket-bob");

            const result = room.disconnectAndTransferHost(bob.id);
            expect(result.newHost).toBeNull();
            expect(result.roomEmpty).toBe(false);
        });

        it("全員切断後に roomEmpty: true となる", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const data = room.toRoom();

            room.disconnectAndTransferHost(bob.id);
            const result = room.disconnectAndTransferHost(data.hostId);
            expect(result.roomEmpty).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // leaveAndTransferHost
    // ----------------------------------------------------------

    describe("leaveAndTransferHost", () => {
        it("ホストが退出した場合、最古参の接続中参加者にホストが移り、ルームから削除される", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.addParticipant("Carol", "socket-carol");
            const hostId = room.hostId; // toRoom() は参照を返すためここで ID を保存

            const result = room.leaveAndTransferHost(hostId);
            expect(result.newHost).not.toBeNull();
            expect(result.newHost!.id).toBe(bob.id);
            expect(result.newHost!.isHost).toBe(true);
            expect(result.roomEmpty).toBe(false);
            // 元ホストはもう参加者に含まれない
            expect(room.getParticipant(hostId)).toBeUndefined();
            expect(room.participantCount).toBe(2);
        });

        it("非ホストが退出した場合、ホストは変更されずルームから削除される", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const hostId = room.hostId;

            const result = room.leaveAndTransferHost(bob.id);
            expect(result.newHost).toBeNull();
            expect(result.roomEmpty).toBe(false);
            expect(room.isHost(hostId)).toBe(true);
            expect(room.getParticipant(bob.id)).toBeUndefined();
            expect(room.participantCount).toBe(1);
        });

        it("最後の参加者が退出した場合、roomEmpty: true", () => {
            const hostId = room.hostId;

            const result = room.leaveAndTransferHost(hostId);
            expect(result.newHost).toBeNull();
            expect(result.roomEmpty).toBe(true);
            expect(room.participantCount).toBe(0);
        });

        it("切断中の参加者がいても退出した参加者は削除される", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            const hostId = room.hostId;

            // ホストが退出。Bob は切断中なのでホスト移譲先がないが、Bob は残る
            const result = room.leaveAndTransferHost(hostId);
            expect(result.roomEmpty).toBe(false);
            expect(room.participantCount).toBe(1);
            expect(room.getParticipant(bob.id)).toBeDefined();
        });
    });

    // ----------------------------------------------------------
    // hasConnectedParticipants
    // ----------------------------------------------------------

    describe("hasConnectedParticipants", () => {
        it("接続中の参加者がいれば true を返す", () => {
            expect(room.hasConnectedParticipants()).toBe(true);
        });

        it("全員切断で false を返す", () => {
            const data = room.toRoom();
            room.disconnectParticipant(data.hostId);
            expect(room.hasConnectedParticipants()).toBe(false);
        });

        it("1人でも接続中なら true を返す", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const data = room.toRoom();
            room.disconnectParticipant(data.hostId);
            expect(room.hasConnectedParticipants()).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // フェーズ管理
    // ----------------------------------------------------------

    describe("changePhase", () => {
        it("フェーズを変更できる", () => {
            room.changePhase("generating");
            expect(room.phase).toBe("generating");
        });
    });

    // ----------------------------------------------------------
    // ロビー復帰
    // ----------------------------------------------------------

    describe("backToLobby", () => {
        it("finished フェーズからロビーに戻れる", () => {
            room.changePhase("finished");
            room.backToLobby();
            expect(room.phase).toBe("lobby");
        });

        it("全参加者の joinedAtQuestion が -1 にリセットされる", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.changePhase("playing");
            const late = room.addParticipant("Late", "socket-late", 3);
            expect(late.joinedAtQuestion).toBe(4);

            room.changePhase("finished");
            room.backToLobby();

            const data = room.toRoom();
            for (const p of data.participants.values()) {
                expect(p.joinedAtQuestion).toBe(-1);
            }
        });

        it("プロフィールが保持される", () => {
            const data = room.toRoom();
            room.updateProfile(data.hostId, dummyProfile);
            room.changePhase("finished");
            room.backToLobby();

            const host = room.getParticipant(data.hostId);
            expect(host?.profile).toEqual(dummyProfile);
        });

        it("finished 以外のフェーズで呼ぶとエラーをスローする", () => {
            // lobby
            expect(() => room.backToLobby()).toThrow(RoomDomainError);
            try {
                room.backToLobby();
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_PHASE");
            }
        });

        it("playing フェーズで呼ぶとエラーをスローする", () => {
            room.changePhase("playing");
            expect(() => room.backToLobby()).toThrow(RoomDomainError);
        });

        it("generating フェーズで呼ぶとエラーをスローする", () => {
            room.changePhase("generating");
            expect(() => room.backToLobby()).toThrow(RoomDomainError);
        });
    });

    // ----------------------------------------------------------
    // クイズ生成判定
    // ----------------------------------------------------------

    describe("canGenerateQuiz", () => {
        it("プロフィール提出者が minParticipants 以上なら true", () => {
            const data = room.toRoom();
            room.updateProfile(data.hostId, dummyProfile);
            const bob = room.addParticipant("Bob", "socket-bob");
            room.updateProfile(bob.id, dummyProfile);
            const carol = room.addParticipant("Carol", "socket-carol");
            room.updateProfile(carol.id, dummyProfile);

            expect(room.canGenerateQuiz(3)).toBe(true);
        });

        it("プロフィール提出者が不足なら false", () => {
            expect(room.canGenerateQuiz(3)).toBe(false);
        });

        it("全フィールド空のプロフィールはカウントしない", () => {
            const emptyProfile: Profile = {
                hometown: "",
                hobbies: "",
                skills: "",
                favorite_food: "",
                surprising_fact: "",
                free_text: "",
            };
            const data = room.toRoom();
            room.updateProfile(data.hostId, emptyProfile);
            expect(room.getProfileSubmittedCount()).toBe(0);
            expect(room.canGenerateQuiz(1)).toBe(false);
        });

        it("空白のみのプロフィールはカウントしない", () => {
            const whitespaceProfile: Profile = {
                hometown: "   ",
                hobbies: "  ",
                skills: "",
                favorite_food: "",
                surprising_fact: "",
                free_text: "",
            };
            const data = room.toRoom();
            room.updateProfile(data.hostId, whitespaceProfile);
            expect(room.getProfileSubmittedCount()).toBe(0);
        });
    });

    // ----------------------------------------------------------
    // isProfileEffective
    // ----------------------------------------------------------

    describe("isProfileEffective", () => {
        it("1フィールドでも非空なら true", () => {
            const profile: Profile = {
                hometown: "Tokyo",
                hobbies: "",
                skills: "",
                favorite_food: "",
                surprising_fact: "",
                free_text: "",
            };
            expect(RoomAggregate.isProfileEffective(profile)).toBe(true);
        });

        it("全フィールド空なら false", () => {
            const profile: Profile = {
                hometown: "",
                hobbies: "",
                skills: "",
                favorite_food: "",
                surprising_fact: "",
                free_text: "",
            };
            expect(RoomAggregate.isProfileEffective(profile)).toBe(false);
        });

        it("空白のみなら false", () => {
            const profile: Profile = {
                hometown: "   ",
                hobbies: "  ",
                skills: "",
                favorite_food: "",
                surprising_fact: "",
                free_text: "",
            };
            expect(RoomAggregate.isProfileEffective(profile)).toBe(false);
        });
    });

    // ----------------------------------------------------------
    // クエリ
    // ----------------------------------------------------------

    describe("getConnectedParticipants", () => {
        it("接続中の参加者のみ返す", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            room.addParticipant("Carol", "socket-carol");

            const connected = room.getConnectedParticipants();
            expect(connected.length).toBe(2); // Alice + Carol
        });
    });

    describe("findBySocketId", () => {
        it("socketId で参加者を検索できる", () => {
            const found = room.findBySocketId("socket-host");
            expect(found?.nickname).toBe("Alice");
        });

        it("存在しない socketId では undefined を返す", () => {
            expect(room.findBySocketId("nonexistent")).toBeUndefined();
        });
    });

    // ----------------------------------------------------------
    // ニックネーム重複チェック
    // ----------------------------------------------------------

    describe("isNicknameAvailable", () => {
        it("未使用のニックネームなら true を返す", () => {
            expect(room.isNicknameAvailable("Bob")).toBe(true);
        });

        it("使用中のニックネームなら false を返す", () => {
            expect(room.isNicknameAvailable("Alice")).toBe(false);
        });

        it("大文字・小文字違いでも false を返す（case-insensitive）", () => {
            expect(room.isNicknameAvailable("alice")).toBe(false);
            expect(room.isNicknameAvailable("ALICE")).toBe(false);
            expect(room.isNicknameAvailable("aLiCe")).toBe(false);
        });

        it("切断中の参加者のニックネームは使用可能（true）", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            expect(room.isNicknameAvailable("Bob")).toBe(true);
        });

        it("切断中の参加者のニックネームは case-insensitive でも使用可能", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            expect(room.isNicknameAvailable("bob")).toBe(true);
            expect(room.isNicknameAvailable("BOB")).toBe(true);
        });
    });

    // ----------------------------------------------------------
    // clientId による重複参加チェック
    // ----------------------------------------------------------

    describe("hasConnectedClientId", () => {
        it("接続中の参加者に同一 clientId があれば true を返す", () => {
            room.addParticipant("Bob", "socket-bob", -1, "client-123");
            expect(room.hasConnectedClientId("client-123")).toBe(true);
        });

        it("clientId が一致する参加者がいなければ false を返す", () => {
            room.addParticipant("Bob", "socket-bob", -1, "client-123");
            expect(room.hasConnectedClientId("client-999")).toBe(false);
        });

        it("切断中の参加者の clientId は対象外（false）", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "client-123");
            room.disconnectParticipant(bob.id);
            expect(room.hasConnectedClientId("client-123")).toBe(false);
        });

        it("clientId が未設定の参加者は対象外", () => {
            room.addParticipant("Bob", "socket-bob");
            expect(room.hasConnectedClientId("client-123")).toBe(false);
        });

        it("Host の clientId も検出する", () => {
            const roomWithClientId = RoomAggregate.create("XYZ789", "Alice", "socket-host", "client-host");
            expect(roomWithClientId.hasConnectedClientId("client-host")).toBe(true);
        });
    });

    describe("addParticipant（clientId 重複チェック）", () => {
        it("同一 clientId の接続中参加者がいる場合 DUPLICATE_CLIENT をスローする", () => {
            room.addParticipant("Bob", "socket-bob", -1, "client-123");
            try {
                room.addParticipant("Carol", "socket-carol", -1, "client-123");
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("DUPLICATE_CLIENT");
            }
        });

        it("Host と同じ clientId で参加しようとすると DUPLICATE_CLIENT をスローする", () => {
            const roomWithClientId = RoomAggregate.create("XYZ789", "Alice", "socket-host", "client-host");
            try {
                roomWithClientId.addParticipant("Bob", "socket-bob", -1, "client-host");
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("DUPLICATE_CLIENT");
            }
        });

        it("切断中の参加者と同じ clientId なら参加できる", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "client-123");
            room.disconnectParticipant(bob.id);
            const carol = room.addParticipant("Carol", "socket-carol", -1, "client-123");
            expect(carol.nickname).toBe("Carol");
            expect(carol.clientId).toBe("client-123");
        });

        it("clientId を省略した場合は重複チェックをスキップする", () => {
            room.addParticipant("Bob", "socket-bob", -1, "client-123");
            // clientId 省略 → DUPLICATE_CLIENT にはならない
            const carol = room.addParticipant("Carol", "socket-carol");
            expect(carol.nickname).toBe("Carol");
        });
    });

    describe("removeDisconnectedByClientId", () => {
        it("切断中の同一 clientId 参加者を削除して返す", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "client-123");
            room.disconnectParticipant(bob.id);

            const removed = room.removeDisconnectedByClientId("client-123");
            expect(removed).not.toBeNull();
            expect(removed!.nickname).toBe("Bob");
            expect(room.getParticipant(bob.id)).toBeUndefined();
        });

        it("接続中の同一 clientId 参加者は対象外（null を返す）", () => {
            room.addParticipant("Bob", "socket-bob", -1, "client-123");

            const removed = room.removeDisconnectedByClientId("client-123");
            expect(removed).toBeNull();
        });

        it("clientId が未設定の切断中参加者は対象外", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);

            const removed = room.removeDisconnectedByClientId("client-123");
            expect(removed).toBeNull();
        });

        it("該当する参加者がいなければ null を返す", () => {
            const removed = room.removeDisconnectedByClientId("client-999");
            expect(removed).toBeNull();
        });

        it("削除後に同じニックネームが使用可能になる", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "client-123");
            room.disconnectParticipant(bob.id);
            room.removeDisconnectedByClientId("client-123");

            // 同じニックネームで新しい参加者が追加できる
            const newBob = room.addParticipant("Bob", "socket-new", -1, "client-123");
            expect(newBob.nickname).toBe("Bob");
        });
    });

    describe("reconnectParticipant（clientId 更新）", () => {
        it("再接続時に clientId を更新する", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "old-client");
            room.disconnectParticipant(bob.id);

            const reconnected = room.reconnectParticipant("Bob", "socket-bob-new", "new-client");
            expect(reconnected).not.toBeNull();
            expect(reconnected!.clientId).toBe("new-client");
        });

        it("clientId を省略して再接続しても既存の clientId は保持される", () => {
            const bob = room.addParticipant("Bob", "socket-bob", -1, "client-123");
            room.disconnectParticipant(bob.id);

            const reconnected = room.reconnectParticipant("Bob", "socket-bob-new");
            expect(reconnected).not.toBeNull();
            expect(reconnected!.clientId).toBe("client-123");
        });
    });

    // ----------------------------------------------------------
    // プロフィール項目管理 (updateProfileFields)
    // ----------------------------------------------------------

    describe("updateProfileFields", () => {
        it("ホストがロビーフェーズでプロフィール項目を更新できる", () => {
            const hostId = room.hostId;
            const newFields: ProfileFieldDefinition[] = [
                { id: "color", label: "好きな色", placeholder: "例: 青" },
                { id: "animal", label: "好きな動物", placeholder: "例: 猫" },
            ];
            const invalidated = room.updateProfileFields(newFields, hostId);
            expect(room.profileFields).toEqual(newFields);
            // フィールド構成が変わったので invalidated = true
            expect(invalidated).toBe(true);
        });

        it("同じフィールド ID 構成の場合、profilesInvalidated = false", () => {
            const hostId = room.hostId;
            // デフォルトと同じ ID 構成でラベルだけ変更
            const sameIds = DEFAULT_PROFILE_FIELDS.map((f) => ({
                ...f,
                label: f.label + "★",
            }));
            const invalidated = room.updateProfileFields(sameIds, hostId);
            expect(invalidated).toBe(false);
        });

        it("フィールド変更時に全参加者のプロフィールがリセットされる", () => {
            const hostId = room.hostId;
            room.updateProfile(hostId, dummyProfile);
            expect(room.getParticipant(hostId)?.profile).not.toBeNull();

            const newFields: ProfileFieldDefinition[] = [
                { id: "new_field", label: "新項目", placeholder: "" },
            ];
            room.updateProfileFields(newFields, hostId);

            // プロフィールがリセットされている
            expect(room.getParticipant(hostId)?.profile).toBeNull();
        });

        it("フィールド変更なし（ラベルのみ変更）ではプロフィールが保持される", () => {
            const hostId = room.hostId;
            room.updateProfile(hostId, dummyProfile);

            const sameIds = DEFAULT_PROFILE_FIELDS.map((f) => ({
                ...f,
                label: f.label + " (edited)",
            }));
            room.updateProfileFields(sameIds, hostId);

            expect(room.getParticipant(hostId)?.profile).toEqual(dummyProfile);
        });

        it("ホスト以外が呼ぶと NOT_HOST エラー", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const fields: ProfileFieldDefinition[] = [
                { id: "x", label: "X", placeholder: "" },
            ];
            try {
                room.updateProfileFields(fields, bob.id);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("NOT_HOST");
            }
        });

        it("ロビー以外のフェーズでは INVALID_PHASE エラー", () => {
            room.changePhase("playing");
            const hostId = room.hostId;
            const fields: ProfileFieldDefinition[] = [
                { id: "x", label: "X", placeholder: "" },
            ];
            try {
                room.updateProfileFields(fields, hostId);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_PHASE");
            }
        });

        it("項目数が MIN_PROFILE_FIELDS 未満だと INVALID_FIELDS エラー", () => {
            const hostId = room.hostId;
            try {
                room.updateProfileFields([], hostId);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_FIELDS");
            }
        });

        it("項目数が MAX_PROFILE_FIELDS を超えると INVALID_FIELDS エラー", () => {
            const hostId = room.hostId;
            const tooMany: ProfileFieldDefinition[] = Array.from(
                { length: MAX_PROFILE_FIELDS + 1 },
                (_, i) => ({ id: `f${i}`, label: `Field ${i}`, placeholder: "" }),
            );
            try {
                room.updateProfileFields(tooMany, hostId);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_FIELDS");
            }
        });

        it("ID が重複している場合 INVALID_FIELDS エラー", () => {
            const hostId = room.hostId;
            const duplicateIds: ProfileFieldDefinition[] = [
                { id: "same", label: "A", placeholder: "" },
                { id: "same", label: "B", placeholder: "" },
            ];
            try {
                room.updateProfileFields(duplicateIds, hostId);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_FIELDS");
            }
        });

        it("デフォルトのプロフィール項目が初期値として設定されている", () => {
            expect(room.profileFields).toEqual(DEFAULT_PROFILE_FIELDS);
        });
    });

    // ----------------------------------------------------------
    // アニメーションテーマ
    // ----------------------------------------------------------

    describe("setAnimationTheme", () => {
        it("デフォルトは subtle テーマ", () => {
            expect(room.animationTheme).toBe(DEFAULT_ANIMATION_THEME);
            expect(room.animationTheme).toBe("subtle");
        });

        it("Host がテーマを変更できる", () => {
            room.setAnimationTheme("fun", room.hostId);
            expect(room.animationTheme).toBe("fun");
        });

        it("全テーマに変更可能", () => {
            const themes = ["subtle", "fun", "cyber", "party", "sakura"] as const;
            for (const theme of themes) {
                room.setAnimationTheme(theme, room.hostId);
                expect(room.animationTheme).toBe(theme);
            }
        });

        it("Non-host がテーマを変更しようとするとエラー", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            try {
                room.setAnimationTheme("fun", bob.id);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("NOT_HOST");
            }
        });

        it("lobby 以外のフェーズではエラー", () => {
            room.changePhase("playing");
            try {
                room.setAnimationTheme("cyber", room.hostId);
                expect.fail("should have thrown");
            } catch (e) {
                expect(e).toBeInstanceOf(RoomDomainError);
                expect((e as RoomDomainError).code).toBe("INVALID_PHASE");
            }
        });

        it("toRoom() にテーマが含まれる", () => {
            room.setAnimationTheme("sakura", room.hostId);
            const roomData = room.toRoom();
            expect(roomData.animationTheme).toBe("sakura");
        });
    });

    // ============================================================
    // kickParticipant
    // ============================================================

    describe("kickParticipant", () => {
        it("ホストが参加者をキックできる", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const kicked = room.kickParticipant(bob.id, room.hostId);
            expect(kicked.nickname).toBe("Bob");
            expect(room.participantCount).toBe(1); // ホストのみ残る
            expect(room.getParticipant(bob.id)).toBeUndefined();
        });

        it("切断中の参加者もキックできる", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            room.disconnectParticipant(bob.id);
            const kicked = room.kickParticipant(bob.id, room.hostId);
            expect(kicked.nickname).toBe("Bob");
            expect(room.participantCount).toBe(1);
        });

        it("ホスト以外がキックしようとするとエラーをスローする", () => {
            const bob = room.addParticipant("Bob", "socket-bob");
            const charlie = room.addParticipant("Charlie", "socket-charlie");
            expect(() => room.kickParticipant(charlie.id, bob.id)).toThrow(
                expect.objectContaining({ code: "NOT_HOST" }),
            );
        });

        it("自分自身をキックしようとするとエラーをスローする", () => {
            expect(() => room.kickParticipant(room.hostId, room.hostId)).toThrow(
                expect.objectContaining({ code: "CANNOT_KICK_SELF" }),
            );
        });

        it("存在しない参加者をキックしようとするとエラーをスローする", () => {
            expect(() => room.kickParticipant("non-existent-id", room.hostId)).toThrow(
                expect.objectContaining({ code: "PARTICIPANT_NOT_FOUND" }),
            );
        });
    });
});
