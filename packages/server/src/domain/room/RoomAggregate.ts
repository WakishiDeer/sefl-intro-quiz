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
    ProfileFieldDefinition,
    AnimationThemeName,
} from "@self-intro-quiz/shared";
import { MAX_PARTICIPANTS, DEFAULT_PROFILE_FIELDS, MIN_PROFILE_FIELDS, MAX_PROFILE_FIELDS, DEFAULT_ANIMATION_THEME, ANIMATION_THEMES } from "@self-intro-quiz/shared";

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
     *
     * @param roomCode - ルームコード
     * @param hostNickname - Host のニックネーム
     * @param hostSocketId - Host の Socket.IO socket.id
     * @param hostClientId - Host のブラウザ固有識別子（マルチタブ重複防止用）
     */
    static create(roomCode: string, hostNickname: string, hostSocketId: string, hostClientId?: string): RoomAggregate {
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
            ...(hostClientId ? { clientId: hostClientId } : {}),
        };

        const participants = new Map<string, Participant>();
        participants.set(hostId, host);

        const room: Room = {
            code: roomCode,
            hostId,
            phase: "lobby",
            participants,
            profileFields: [...DEFAULT_PROFILE_FIELDS],
            animationTheme: DEFAULT_ANIMATION_THEME,
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
     * @param clientId - ブラウザ固有識別子（同一ブラウザの別タブからの重複参加を防止）
     * @returns 作成された Participant
     * @throws RoomDomainError ROOM_FULL / NICKNAME_TAKEN / DUPLICATE_CLIENT
     */
    addParticipant(nickname: string, socketId: string, currentQuestionIndex = -1, clientId?: string): Participant {
        if (this.room.participants.size >= MAX_PARTICIPANTS) {
            throw new RoomDomainError("ROOM_FULL", "ルームが満員です");
        }

        // ニックネーム重複チェック（接続中の参加者のみ対象、case-insensitive）
        if (!this.isNicknameAvailable(nickname)) {
            throw new RoomDomainError("NICKNAME_TAKEN", "このニックネームは既に使われています");
        }

        // 同一ブラウザ（clientId）からの重複参加チェック
        if (clientId && this.hasConnectedClientId(clientId)) {
            throw new RoomDomainError(
                "DUPLICATE_CLIENT",
                "このブラウザは既にこのルームに参加しています",
            );
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
            ...(clientId ? { clientId } : {}),
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
     * @param nickname - ニックネーム
     * @param newSocketId - 新しい Socket.IO の socket.id
     * @param clientId - ブラウザ固有識別子（再接続時に更新）
     * @returns 再接続された Participant。見つからなければ null
     */
    reconnectParticipant(nickname: string, newSocketId: string, clientId?: string): Participant | null {
        const lowerNickname = nickname.toLowerCase();
        for (const p of this.room.participants.values()) {
            if (p.nickname.toLowerCase() === lowerNickname && !p.isConnected) {
                p.socketId = newSocketId;
                p.isConnected = true;
                if (clientId) {
                    p.clientId = clientId;
                }
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
     * プロフィール入力項目定義を更新する（Host 専用）。
     *
     * フィールド構成が変更された場合、全参加者のプロフィールを null にリセットして
     * 再入力を促す。同一のフィールド構成であればリセットは行わない。
     *
     * @param fields - 新しいプロフィール項目定義（1〜10個）
     * @param callerParticipantId - 操作者の participantId
     * @returns profilesInvalidated - プロフィールがリセットされたかどうか
     * @throws RoomDomainError NOT_HOST / INVALID_PHASE / INVALID_FIELDS
     */
    updateProfileFields(fields: ProfileFieldDefinition[], callerParticipantId: string): boolean {
        if (!this.isHost(callerParticipantId)) {
            throw new RoomDomainError("NOT_HOST", "ホストのみがプロフィール項目を編集できます");
        }

        if (this.room.phase !== "lobby") {
            throw new RoomDomainError("INVALID_PHASE", "ロビーフェーズでのみ項目を編集できます");
        }

        if (fields.length < MIN_PROFILE_FIELDS || fields.length > MAX_PROFILE_FIELDS) {
            throw new RoomDomainError(
                "INVALID_FIELDS",
                `項目数は${MIN_PROFILE_FIELDS}個以上${MAX_PROFILE_FIELDS}個以下です`,
            );
        }

        // ID 重複チェック
        const ids = fields.map((f) => f.id);
        if (new Set(ids).size !== ids.length) {
            throw new RoomDomainError("INVALID_FIELDS", "項目IDが重複しています");
        }

        // フィールド構成が変更されたか判定
        const oldIds = this.room.profileFields.map((f) => f.id).sort().join(",");
        const newIds = [...ids].sort().join(",");
        const fieldsChanged = oldIds !== newIds;

        this.room.profileFields = fields;
        this.room.lastActivityAt = Date.now();

        // フィールド構成が変わった場合、全参加者のプロフィールをリセット
        if (fieldsChanged) {
            for (const p of this.room.participants.values()) {
                p.profile = null;
            }
        }

        return fieldsChanged;
    }

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

    /**
     * 参加者を切断し、ホストだった場合は即座にホスト権限を移譲する。
     * 全参加者が切断済みかどうか（空ルーム判定）も返す。
     *
     * ドメインルール:
     * - ホストが切断した場合、接続中の最古参参加者にホスト権限が即時移譲される
     * - 移譲先がいない場合（全員切断）、ルームは空と判定される
     * - 非ホストの切断ではホスト移譲は発生しない
     *
     * @param participantId - 切断する参加者の ID
     * @returns newHost: 新しいホスト（移譲が発生した場合）、roomEmpty: 全員切断かどうか
     */
    disconnectAndTransferHost(participantId: string): { newHost: Participant | null; roomEmpty: boolean } {
        this.disconnectParticipant(participantId);

        let newHost: Participant | null = null;
        if (this.isHost(participantId)) {
            newHost = this.transferHost();
        }

        const roomEmpty = !this.hasConnectedParticipants();
        return { newHost, roomEmpty };
    }

    /**
     * 参加者を明示的にルームから退出させる（完全削除）。
     * ホストだった場合は先にホスト権限を移譲する。
     *
     * disconnectAndTransferHost との違い:
     * - disconnect: isConnected=false にして参加者を残す（再接続猶予あり）
     * - leave: 参加者を完全に削除する（退出ボタン押下 / 切断タイムアウト後）
     *
     * @param participantId - 退出する参加者の ID
     * @returns newHost: 新しいホスト（移譲が発生した場合）、roomEmpty: 参加者が0人になったか
     */
    leaveAndTransferHost(participantId: string): { newHost: Participant | null; roomEmpty: boolean } {
        let newHost: Participant | null = null;

        if (this.isHost(participantId)) {
            newHost = this.transferHost();
        }

        this.removeParticipant(participantId);

        const roomEmpty = this.room.participants.size === 0;
        return { newHost, roomEmpty };
    }

    /**
     * 接続中の参加者が1人以上いるかを判定する。
     *
     * ドメインルール: 全参加者が切断した場合、ルームは「空」と見なされ、
     * 自動削除の対象となる。
     */
    hasConnectedParticipants(): boolean {
        for (const p of this.room.participants.values()) {
            if (p.isConnected) return true;
        }
        return false;
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
     * クイズ終了後にロビーフェーズへ戻す。
     *
     * - フェーズを "lobby" に変更
     * - 全参加者の joinedAtQuestion を -1 にリセット（次回クイズで最初から回答可能に）
     * - プロフィールは保持する（再入力不要ですぐにクイズ再生成可能）
     *
     * @throws RoomDomainError INVALID_PHASE — finished 以外のフェーズで呼ばれた場合
     */
    backToLobby(): void {
        if (this.room.phase !== "finished") {
            throw new RoomDomainError(
                "INVALID_PHASE",
                "ロビーに戻れるのはクイズ終了後のみです",
            );
        }

        this.room.phase = "lobby";
        this.room.lastActivityAt = Date.now();

        // 全参加者の joinedAtQuestion をリセット
        for (const p of this.room.participants.values()) {
            p.joinedAtQuestion = -1;
        }
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
    // アニメーションテーマ
    // ----------------------------------------------------------

    /**
     * アニメーションテーマを変更する。
     * Host のみがロビーフェーズで変更可能。
     *
     * @param theme - 新しいテーマ名
     * @param callerParticipantId - 変更をリクエストした参加者の ID
     * @throws RoomDomainError NOT_HOST — Host 以外が変更しようとした場合
     * @throws RoomDomainError INVALID_PHASE — lobby 以外のフェーズで変更しようとした場合
     * @throws RoomDomainError INVALID_THEME — 無効なテーマ名の場合
     */
    setAnimationTheme(theme: AnimationThemeName, callerParticipantId: string): void {
        if (!this.isHost(callerParticipantId)) {
            throw new RoomDomainError("NOT_HOST", "テーマを変更できるのはホストのみです");
        }
        if (this.room.phase !== "lobby") {
            throw new RoomDomainError("INVALID_PHASE", "テーマの変更はロビーでのみ可能です");
        }
        if (!ANIMATION_THEMES.includes(theme)) {
            throw new RoomDomainError("INVALID_THEME", `無効なテーマ名です: ${theme}`);
        }
        this.room.animationTheme = theme;
        this.room.lastActivityAt = Date.now();
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
     * 指定 clientId が接続中の参加者に存在するかチェックする。
     * 同一ブラウザ（タブ違い）からの重複参加を検出するために使用。
     *
     * @returns 接続中の参加者に同一 clientId が存在すれば true
     */
    hasConnectedClientId(clientId: string): boolean {
        for (const p of this.room.participants.values()) {
            if (p.clientId === clientId && p.isConnected) {
                return true;
            }
        }
        return false;
    }

    /**
     * 同一 clientId の切断中参加者を検索して完全削除する。
     *
     * ユースケース: ユーザーが "aa" でタブを閉じた後、同じブラウザから "bb" で
     * 再参加する場合に、グレー表示の "aa" を即座にクリーンアップする。
     *
     * @param clientId - ブラウザ固有識別子
     * @returns 削除された参加者。該当なしなら null
     */
    removeDisconnectedByClientId(clientId: string): Participant | null {
        for (const p of this.room.participants.values()) {
            if (p.clientId === clientId && !p.isConnected) {
                this.removeParticipant(p.id);
                return p;
            }
        }
        return null;
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

    /** 現在のプロフィール項目定義 */
    get profileFields(): ProfileFieldDefinition[] {
        return this.room.profileFields;
    }

    /** 現在のアニメーションテーマ */
    get animationTheme(): AnimationThemeName {
        return this.room.animationTheme;
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
