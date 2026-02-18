/**
 * RoomAggregate — Room Context の集約ルート
 *
 * ルーム作成・参加者管理・Host 権限・フェーズ遷移のドメインロジックを集約する。
 * 外部依存（DB, Socket.IO 等）は一切持たず、純粋なドメインロジックのみ。
 */

import { v4 as uuidv4 } from "uuid";
import type {
    Room,
    RoomPhase,
    Participant,
    Profile,
} from "@self-intro-quiz/shared";
import { MAX_PARTICIPANTS } from "@self-intro-quiz/shared";

// ============================================================
// ドメインエラー
// ============================================================

/** Room Context 固有のドメインエラー */
export class RoomDomainError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "RoomDomainError";
    }
}

// ============================================================
// RoomAggregate
// ============================================================

export class RoomAggregate {
    private room: Room;

    private constructor(room: Room) {
        this.room = room;
    }

    // ----------------------------------------------------------
    // ファクトリ
    // ----------------------------------------------------------

    /**
     * 新しいルームを作成する。
     * Host として最初の参加者を同時に登録する。
     */
    static create(roomCode: string, hostNickname: string, hostSocketId: string): RoomAggregate {
        const hostId = uuidv4();
        const now = Date.now();

        const host: Participant = {
            id: hostId,
            nickname: hostNickname,
            socketId: hostSocketId,
            profile: null,
            isHost: true,
            joinedAtQuestion: -1,
            isConnected: true,
            joinedAt: now,
        };

        const participants = new Map<string, Participant>();
        participants.set(hostId, host);

        const room: Room = {
            code: roomCode,
            hostId,
            phase: "lobby",
            participants,
            createdAt: now,
            lastActivityAt: now,
        };

        return new RoomAggregate(room);
    }

    /**
     * 既存の Room データから Aggregate を復元する。
     * Repository からの読み込み時に使用。
     */
    static fromRoom(room: Room): RoomAggregate {
        return new RoomAggregate(room);
    }

    // ----------------------------------------------------------
    // 参加者管理
    // ----------------------------------------------------------

    /**
     * 新しい参加者を追加する。
     *
     * @param nickname - ニックネーム（ルーム内ユニーク）
     * @param socketId - Socket.IO の socket.id
     * @param currentQuestionIndex - 現在の問題番号（途中参加の場合）
     * @returns 作成された Participant
     * @throws RoomDomainError ROOM_FULL / NICKNAME_TAKEN
     */
    addParticipant(nickname: string, socketId: string, currentQuestionIndex = -1): Participant {
        if (this.room.participants.size >= MAX_PARTICIPANTS) {
            throw new RoomDomainError("ROOM_FULL", "ルームが満員です");
        }

        // ニックネーム重複チェック（接続中の参加者のみ対象、case-insensitive）
        if (!this.isNicknameAvailable(nickname)) {
            throw new RoomDomainError("NICKNAME_TAKEN", "このニックネームは既に使われています");
        }

        const participantId = uuidv4();
        const now = Date.now();

        // 途中参加の場合、次の問題から回答可能
        let joinedAtQuestion = -1;
        if (this.room.phase === "playing" || this.room.phase === "revealing") {
            joinedAtQuestion = currentQuestionIndex + 1;
        } else if (this.room.phase === "finished") {
            // finished フェーズでの参加は結果閲覧のみ
            joinedAtQuestion = 10;
        }

        const participant: Participant = {
            id: participantId,
            nickname,
            socketId,
            profile: null,
            isHost: false,
            joinedAtQuestion,
            isConnected: true,
            joinedAt: now,
        };

        this.room.participants.set(participantId, participant);
        this.room.lastActivityAt = now;

        return participant;
    }

    /**
     * 参加者を離脱状態にする（isConnected = false）。
     * ルームからは削除しない（再接続の可能性があるため）。
     */
    disconnectParticipant(participantId: string): void {
        const participant = this.room.participants.get(participantId);
        if (!participant) return;

        participant.isConnected = false;
        this.room.lastActivityAt = Date.now();
    }

    /**
     * 参加者をルームから完全に削除する。
     */
    removeParticipant(participantId: string): void {
        this.room.participants.delete(participantId);
        this.room.lastActivityAt = Date.now();
    }

    /**
     * 切断中の同名参加者を探して再接続する。
     * 大文字・小文字を区別しない（case-insensitive）。
     *
     * @returns 再接続された Participant。見つからなければ null
     */
    reconnectParticipant(nickname: string, newSocketId: string): Participant | null {
        const lowerNickname = nickname.toLowerCase();
        for (const p of this.room.participants.values()) {
            if (p.nickname.toLowerCase() === lowerNickname && !p.isConnected) {
                p.socketId = newSocketId;
                p.isConnected = true;
                this.room.lastActivityAt = Date.now();
                return p;
            }
        }
        return null;
    }

    // ----------------------------------------------------------
    // プロフィール管理
    // ----------------------------------------------------------

    /**
     * 参加者のプロフィールを更新する。
     *
     * @throws RoomDomainError PARTICIPANT_NOT_FOUND / INVALID_PHASE
     */
    updateProfile(participantId: string, profile: Profile): void {
        if (this.room.phase !== "lobby") {
            throw new RoomDomainError("INVALID_PHASE", "ロビーフェーズでのみプロフィールを更新できます");
        }

        const participant = this.room.participants.get(participantId);
        if (!participant) {
            throw new RoomDomainError("PARTICIPANT_NOT_FOUND", "参加者が見つかりません");
        }

        participant.profile = profile;
        this.room.lastActivityAt = Date.now();
    }

    // ----------------------------------------------------------
    // Host 管理
    // ----------------------------------------------------------

    /** 指定された参加者が Host かどうか */
    isHost(participantId: string): boolean {
        return this.room.hostId === participantId;
    }

    /**
     * Host 権限を最も古い接続中参加者に移譲する。
     *
     * @returns 新しい Host。移譲先がいなければ null
     */
    transferHost(): Participant | null {
        // 現在の Host の isHost を false に
        const currentHost = this.room.participants.get(this.room.hostId);
        if (currentHost) {
            currentHost.isHost = false;
        }

        // joinedAt が最も古い接続中の参加者を選出
        let earliest: Participant | null = null;
        for (const p of this.room.participants.values()) {
            if (p.isConnected && p.id !== this.room.hostId) {
                if (!earliest || p.joinedAt < earliest.joinedAt) {
                    earliest = p;
                }
            }
        }

        if (earliest) {
            earliest.isHost = true;
            this.room.hostId = earliest.id;
            this.room.lastActivityAt = Date.now();
        }

        return earliest;
    }

    // ----------------------------------------------------------
    // フェーズ管理
    // ----------------------------------------------------------

    /**
     * フェーズを変更する。
     * 遷移の妥当性はアプリケーション層で判断済みの前提。
     */
    changePhase(newPhase: RoomPhase): void {
        this.room.phase = newPhase;
        this.room.lastActivityAt = Date.now();
    }

    /**
     * クイズ生成の前提条件を満たしているか。
     *
     * @param minParticipants - 最低参加者数
     * @returns プロフィール入力済みの参加者数が minParticipants 以上
     */
    canGenerateQuiz(minParticipants: number): boolean {
        return this.getProfileSubmittedCount() >= minParticipants;
    }

    // ----------------------------------------------------------
    // クエリ
    // ----------------------------------------------------------

    /** 接続中の参加者一覧 */
    getConnectedParticipants(): Participant[] {
        return Array.from(this.room.participants.values()).filter((p) => p.isConnected);
    }

    /**
     * 指定ニックネームが使用可能かチェックする。
     * 接続中の参加者に対して case-insensitive で比較する。
     *
     * @returns 使用可能なら true、重複なら false
     */
    isNicknameAvailable(nickname: string): boolean {
        const lowerNickname = nickname.toLowerCase();
        for (const p of this.room.participants.values()) {
            if (p.nickname.toLowerCase() === lowerNickname && p.isConnected) {
                return false;
            }
        }
        return true;
    }

    /**
     * 有効なプロフィール（少なくとも1つの非空フィールドがある）の参加者数。
     * 全フィールド空のプロフィールは「未入力」として扱う。
     */
    getProfileSubmittedCount(): number {
        let count = 0;
        for (const p of this.room.participants.values()) {
            if (p.profile !== null && RoomAggregate.isProfileEffective(p.profile)) {
                count++;
            }
        }
        return count;
    }

    /**
     * プロフィールが実質的に入力されているかを判定する。
     * 少なくとも1つのフィールドに非空白文字が含まれていれば有効。
     */
    static isProfileEffective(profile: Profile): boolean {
        return Object.values(profile).some((v) => v.trim().length > 0);
    }

    /** 参加者を ID で取得 */
    getParticipant(participantId: string): Participant | undefined {
        return this.room.participants.get(participantId);
    }

    /** socketId から参加者を検索 */
    findBySocketId(socketId: string): Participant | undefined {
        for (const p of this.room.participants.values()) {
            if (p.socketId === socketId) {
                return p;
            }
        }
        return undefined;
    }

    /** 現在のフェーズ */
    get phase(): RoomPhase {
        return this.room.phase;
    }

    /** ルームコード */
    get code(): string {
        return this.room.code;
    }

    /** Host の participantId */
    get hostId(): string {
        return this.room.hostId;
    }

    /** 参加者数 */
    get participantCount(): number {
        return this.room.participants.size;
    }

    /** Room データのスナップショットを返す */
    toRoom(): Room {
        return this.room;
    }
}
