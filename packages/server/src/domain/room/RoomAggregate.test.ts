/**
 * RoomAggregate.test.ts — RoomAggregate のユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { RoomAggregate, RoomDomainError } from "./RoomAggregate.js";
import type { Profile, Room } from "@self-intro-quiz/shared";
import { MAX_PARTICIPANTS } from "@self-intro-quiz/shared";

// ============================================================
// ヘルパー
// ============================================================

function createRoom(): RoomAggregate {
    return RoomAggregate.create("ABC123", "Alice", "socket-host");
}

const dummyProfile: Profile = {
    hometown: "Tokyo",
    hobbies: "Reading",
    skills: "TypeScript",
    favoriteFood: "Sushi",
    surprisingFact: "I can juggle",
    freeText: "",
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
    // フェーズ管理
    // ----------------------------------------------------------

    describe("changePhase", () => {
        it("フェーズを変更できる", () => {
            room.changePhase("generating");
            expect(room.phase).toBe("generating");
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
                favoriteFood: "",
                surprisingFact: "",
                freeText: "",
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
                favoriteFood: "",
                surprisingFact: "",
                freeText: "",
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
                favoriteFood: "",
                surprisingFact: "",
                freeText: "",
            };
            expect(RoomAggregate.isProfileEffective(profile)).toBe(true);
        });

        it("全フィールド空なら false", () => {
            const profile: Profile = {
                hometown: "",
                hobbies: "",
                skills: "",
                favoriteFood: "",
                surprisingFact: "",
                freeText: "",
            };
            expect(RoomAggregate.isProfileEffective(profile)).toBe(false);
        });

        it("空白のみなら false", () => {
            const profile: Profile = {
                hometown: "   ",
                hobbies: "  ",
                skills: "",
                favoriteFood: "",
                surprisingFact: "",
                freeText: "",
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
});
