/**
 * tabSession.ts — BroadcastChannel によるタブ間セッション調停
 *
 * 「後発タブ優先」方式:
 *   新しいタブが開かれたら、旧タブの Socket を切断させてから
 *   新タブがセッションを引き継ぐ。
 *
 * BroadcastChannel に対応していない環境では即 resolve する
 * 縮退モード（現行と同じ動作）にフォールバックする。
 *
 * メッセージプロトコル:
 *   SESSION_CLAIM  — 新タブ → 旧タブ: 「セッションを渡してほしい」
 *   SESSION_YIELD  — 旧タブ → 新タブ: 「socket を切断した。どうぞ」
 *   SESSION_PROBE  — 任意 → 全タブ: 「アクティブタブはいますか？」
 *   SESSION_ACTIVE — 旧タブ → 応答: 「はい、います」
 */

// ============================================================
// 型定義
// ============================================================

/** BroadcastChannel で送受信するメッセージの共用体型 */
type TabMessage =
    | { type: "SESSION_CLAIM"; tabId: string; timestamp: number }
    | { type: "SESSION_YIELD"; tabId: string }
    | { type: "SESSION_PROBE"; tabId: string }
    | { type: "SESSION_ACTIVE"; tabId: string };

/** セッション譲渡時に呼ばれるコールバック型 */
type YieldCallback = () => void;

// ============================================================
// 定数
// ============================================================

const CHANNEL_NAME = "self-intro-quiz:session";

/** claim() から SESSION_YIELD を待つタイムアウト（ms）。旧タブが応答しない場合の安全弁 */
const CLAIM_TIMEOUT_MS = 500;

/** hasActiveTab() の応答待ちタイムアウト（ms） */
const PROBE_TIMEOUT_MS = 300;

/**
 * claim() 成功後、旧タブの disconnect がサーバに到達するのを待つ遅延（ms）。
 * BroadcastChannel での SESSION_YIELD 受信 → 旧タブの socket.disconnect() →
 * サーバの handleDisconnect → isConnected=false の一連の処理を確実に完了させるための猶予。
 */
export const POST_YIELD_DELAY_MS = 150;

// ============================================================
// TabSession クラス
// ============================================================

/**
 * タブ間のセッション所有権を管理する。
 *
 * 各タブで1インスタンス生成し、RoomPage のライフサイクルに紐づけて使う。
 * destroy() でリスナーを解除し、BroadcastChannel を閉じる。
 */
export class TabSession {
    /** このタブの一意識別子（メモリのみ、永続化しない） */
    readonly tabId: string;

    private channel: BroadcastChannel | null = null;
    private onYieldedCallback: YieldCallback | null = null;

    constructor() {
        this.tabId = crypto.randomUUID();
        if (typeof BroadcastChannel !== "undefined") {
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = this.handleMessage;
        }
    }

    // ----------------------------------------------------------------
    // Public API
    // ----------------------------------------------------------------

    /**
     * セッションの所有権を要求する。
     *
     * SESSION_CLAIM を送信し、旧タブからの SESSION_YIELD を待つ。
     * 旧タブがない（応答タイムアウト）場合も Promise は resolve する。
     *
     * resolve 後に POST_YIELD_DELAY_MS だけ待機してから接続すると、
     * サーバ側で旧ソケットの disconnect 処理が完了していることを期待できる。
     */
    claim(): Promise<void> {
        if (!this.channel) {
            // BroadcastChannel 未サポート: 即 resolve（縮退モード）
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            let resolved = false;

            const done = () => {
                if (resolved) return;
                resolved = true;
                resolve();
            };

            // タイムアウト: 旧タブが応答しなくてもブロックしない
            const timer = setTimeout(done, CLAIM_TIMEOUT_MS);

            // SESSION_YIELD を受信したら即 resolve
            const onYield = (ev: MessageEvent<TabMessage>) => {
                if (ev.data.type === "SESSION_YIELD") {
                    clearTimeout(timer);
                    this.channel?.removeEventListener("message", onYield);
                    done();
                }
            };
            this.channel?.addEventListener("message", onYield);

            // SESSION_CLAIM を送信
            this.channel?.postMessage({
                type: "SESSION_CLAIM",
                tabId: this.tabId,
                timestamp: Date.now(),
            } satisfies TabMessage);
        });
    }

    /**
     * 他タブから SESSION_CLAIM を受信した時のコールバックを登録する。
     *
     * コールバック内で socket.disconnect() + UI 切替を行うこと。
     * コールバック実行後、自動的に SESSION_YIELD を返信する。
     */
    onYielded(callback: YieldCallback): void {
        this.onYieldedCallback = callback;
    }

    /**
     * アクティブな他タブが存在するか確認する。
     *
     * SESSION_PROBE を送信し、SESSION_ACTIVE の応答を待つ。
     * TopPage で「他タブがルーム内にいるなら clearSession() しない」判定に使う。
     */
    hasActiveTab(): Promise<boolean> {
        if (!this.channel) {
            return Promise.resolve(false);
        }

        return new Promise<boolean>((resolve) => {
            let resolved = false;

            const done = (result: boolean) => {
                if (resolved) return;
                resolved = true;
                resolve(result);
            };

            const timer = setTimeout(() => done(false), PROBE_TIMEOUT_MS);

            const onActive = (ev: MessageEvent<TabMessage>) => {
                if (ev.data.type === "SESSION_ACTIVE" && ev.data.tabId !== this.tabId) {
                    clearTimeout(timer);
                    this.channel?.removeEventListener("message", onActive);
                    done(true);
                }
            };
            this.channel?.addEventListener("message", onActive);

            this.channel?.postMessage({
                type: "SESSION_PROBE",
                tabId: this.tabId,
            } satisfies TabMessage);
        });
    }

    /**
     * リソースを解放する。RoomPage のアンマウント時に呼ぶ。
     */
    destroy(): void {
        if (this.channel) {
            this.channel.onmessage = null;
            this.channel.close();
            this.channel = null;
        }
        this.onYieldedCallback = null;
    }

    // ----------------------------------------------------------------
    // Private
    // ----------------------------------------------------------------

    /**
     * BroadcastChannel メッセージハンドラ（アロー関数で this を束縛）
     */
    private handleMessage = (ev: MessageEvent<TabMessage>): void => {
        const msg = ev.data;

        switch (msg.type) {
            case "SESSION_CLAIM":
                // 自分が送った CLAIM は無視
                if (msg.tabId === this.tabId) break;

                // コールバックで socket.disconnect() 等を実行
                this.onYieldedCallback?.();

                // 旧タブとして SESSION_YIELD を返信
                this.channel?.postMessage({
                    type: "SESSION_YIELD",
                    tabId: this.tabId,
                } satisfies TabMessage);
                break;

            case "SESSION_PROBE":
                // 自分が送った PROBE は無視
                if (msg.tabId === this.tabId) break;

                // アクティブタブとして応答
                this.channel?.postMessage({
                    type: "SESSION_ACTIVE",
                    tabId: this.tabId,
                } satisfies TabMessage);
                break;

            // SESSION_YIELD, SESSION_ACTIVE は claim() / hasActiveTab() 内の
            // 個別リスナーで処理するため、ここでは何もしない
            default:
                break;
        }
    };
}
