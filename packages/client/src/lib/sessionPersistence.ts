/**
 * sessionPersistence.ts — セッション永続化ユーティリティ
 *
 * ブラウザリロードやタブ再開時にルームへ自動復帰するため、
 * roomCode と nickname を localStorage に保存する。
 *
 * サーバ側は既にニックネームベースの再接続（reconnectParticipant）を
 * サポートしているため、クライアント側でこれらの情報を保持するだけで
 * リロード後の自動復帰が実現できる。
 */

const STORAGE_KEY = "self-intro-quiz:session";

/** clientId を永続化するキー。ブラウザ単位で固定。 */
const CLIENT_ID_KEY = "self-intro-quiz:clientId";

/** localStorage に保存するセッション情報 */
interface SessionData {
    roomCode: string;
    nickname: string;
}

/**
 * ブラウザ単位の一意識別子を取得する。
 * 未生成の場合は crypto.randomUUID() で生成し localStorage に永続化する。
 * 同一ブラウザの複数タブから同じルームに重複参加することを防止するために使用。
 *
 * @returns UUID v4 形式の clientId
 */
export function getOrCreateClientId(): string {
    try {
        const existing = localStorage.getItem(CLIENT_ID_KEY);
        if (existing) return existing;

        const newId = crypto.randomUUID();
        localStorage.setItem(CLIENT_ID_KEY, newId);
        return newId;
    } catch {
        // localStorage が無効な環境では毎回新規生成（重複チェック不可だが動作は継続）
        return crypto.randomUUID();
    }
}

/**
 * セッション情報を localStorage に保存する。
 * room:created / room:joined 受信時に呼び出す。
 */
export function saveSession(data: SessionData): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // localStorage が無効な環境（プライベートブラウジング等）では無視
    }
}

/**
 * 保存されたセッション情報を読み込む。
 * リロード後の自動再接続判定に使用する。
 *
 * @returns セッション情報。保存されていない場合は null
 */
export function loadSession(): SessionData | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "roomCode" in parsed &&
            "nickname" in parsed &&
            typeof (parsed as SessionData).roomCode === "string" &&
            typeof (parsed as SessionData).nickname === "string"
        ) {
            return parsed as SessionData;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * セッション情報を削除する。
 * room:closed 受信時、意図的な退出時、トップページ遷移時に呼び出す。
 */
export function clearSession(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // 無視
    }
}
