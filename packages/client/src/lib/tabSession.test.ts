/**
 * tabSession.test.ts — TabSession のユニットテスト
 *
 * BroadcastChannel を Mock し、タブ間メッセージの送受信をシミュレートする。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TabSession, POST_YIELD_DELAY_MS } from "./tabSession.js";

// ============================================================
// BroadcastChannel Mock
// ============================================================

/**
 * テスト用の BroadcastChannel モック。
 * 全インスタンスで同じチャネル名を共有し、postMessage で相互にメッセージを配信する。
 */
const channels = new Map<string, Set<MockBroadcastChannel>>();

class MockBroadcastChannel {
    readonly name: string;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    private listeners: Map<string, Set<(ev: MessageEvent) => void>> = new Map();
    private closed = false;

    constructor(name: string) {
        this.name = name;
        if (!channels.has(name)) {
            channels.set(name, new Set());
        }
        channels.get(name)!.add(this);
    }

    postMessage(data: unknown): void {
        if (this.closed) return;
        const peers = channels.get(this.name);
        if (!peers) return;

        // 他の全チャネルインスタンスにメッセージを配信（自分自身にも配信 — 実際の BroadcastChannel と同じ挙動ではないが、
        // TabSession 側で tabId フィルタしているのでテスト上問題ない）
        for (const peer of peers) {
            if (peer === this || peer.closed) continue;
            const event = new MessageEvent("message", { data });
            // onmessage コールバック
            peer.onmessage?.(event);
            // addEventListener で登録されたリスナー
            const set = peer.listeners.get("message");
            if (set) {
                for (const fn of set) fn(event);
            }
        }
    }

    addEventListener(type: string, listener: (ev: MessageEvent) => void): void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(listener);
    }

    removeEventListener(type: string, listener: (ev: MessageEvent) => void): void {
        this.listeners.get(type)?.delete(listener);
    }

    close(): void {
        this.closed = true;
        channels.get(this.name)?.delete(this);
    }
}

// グローバルに Mock を設定
beforeEach(() => {
    channels.clear();
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
});

afterEach(() => {
    channels.clear();
    vi.restoreAllMocks();
});

// ============================================================
// テスト
// ============================================================

describe("TabSession", () => {
    describe("constructor", () => {
        it("一意な tabId が生成される", () => {
            const a = new TabSession();
            const b = new TabSession();
            expect(a.tabId).not.toBe(b.tabId);
            a.destroy();
            b.destroy();
        });
    });

    describe("claim()", () => {
        it("旧タブが存在しない場合、タイムアウト後に resolve する", async () => {
            const session = new TabSession();
            const start = Date.now();
            await session.claim();
            const elapsed = Date.now() - start;
            // CLAIM_TIMEOUT_MS (500ms) 前後で解決する（許容範囲を持たせる）
            expect(elapsed).toBeGreaterThanOrEqual(400);
            session.destroy();
        });

        it("旧タブが SESSION_YIELD を返すと即座に resolve する", async () => {
            // 旧タブを模倣
            const oldTab = new TabSession();
            const yieldCallback = vi.fn();
            oldTab.onYielded(yieldCallback);

            // 新タブが claim
            const newTab = new TabSession();
            const start = Date.now();
            await newTab.claim();
            const elapsed = Date.now() - start;

            // タイムアウトより十分早く解決する
            expect(elapsed).toBeLessThan(200);
            // 旧タブの onYielded コールバックが呼ばれた
            expect(yieldCallback).toHaveBeenCalledOnce();

            oldTab.destroy();
            newTab.destroy();
        });

        it("自分自身の CLAIM は無視する（無限ループ防止）", async () => {
            const session = new TabSession();
            const yieldCallback = vi.fn();
            session.onYielded(yieldCallback);

            // 他タブがいないので、タイムアウトまで待つ
            await session.claim();

            // 自分の CLAIM で onYielded が呼ばれていないこと
            expect(yieldCallback).not.toHaveBeenCalled();

            session.destroy();
        });
    });

    describe("onYielded()", () => {
        it("他タブから SESSION_CLAIM を受信するとコールバックが呼ばれる", async () => {
            const oldTab = new TabSession();
            const yieldCallback = vi.fn();
            oldTab.onYielded(yieldCallback);

            const newTab = new TabSession();
            await newTab.claim();

            expect(yieldCallback).toHaveBeenCalledOnce();

            oldTab.destroy();
            newTab.destroy();
        });

        it("3タブ: 最後の CLAIM が全旧タブを yield させる", async () => {
            const tab1 = new TabSession();
            const yield1 = vi.fn();
            tab1.onYielded(yield1);

            const tab2 = new TabSession();
            const yield2 = vi.fn();
            tab2.onYielded(yield2);

            const tab3 = new TabSession();
            await tab3.claim();

            // tab1 と tab2 の両方が yield した
            expect(yield1).toHaveBeenCalledOnce();
            expect(yield2).toHaveBeenCalledOnce();

            tab1.destroy();
            tab2.destroy();
            tab3.destroy();
        });
    });

    describe("hasActiveTab()", () => {
        it("アクティブな他タブがいる場合、true を返す", async () => {
            const activeTab = new TabSession();
            const probeTab = new TabSession();

            const result = await probeTab.hasActiveTab();

            expect(result).toBe(true);

            activeTab.destroy();
            probeTab.destroy();
        });

        it("他タブがいない場合、タイムアウト後に false を返す", async () => {
            const session = new TabSession();
            const result = await session.hasActiveTab();
            expect(result).toBe(false);
            session.destroy();
        });

        it("destroy 済みのタブは応答しない", async () => {
            const oldTab = new TabSession();
            oldTab.destroy();

            const probeTab = new TabSession();
            const result = await probeTab.hasActiveTab();
            expect(result).toBe(false);

            probeTab.destroy();
        });
    });

    describe("destroy()", () => {
        it("destroy 後は claim に応答しない", async () => {
            const oldTab = new TabSession();
            const yieldCallback = vi.fn();
            oldTab.onYielded(yieldCallback);
            oldTab.destroy();

            const newTab = new TabSession();
            await newTab.claim();

            expect(yieldCallback).not.toHaveBeenCalled();

            newTab.destroy();
        });
    });

    describe("BroadcastChannel 未サポート環境", () => {
        it("claim() は即座に resolve する", async () => {
            vi.stubGlobal("BroadcastChannel", undefined);

            const session = new TabSession();
            const start = Date.now();
            await session.claim();
            const elapsed = Date.now() - start;

            expect(elapsed).toBeLessThan(50);
            session.destroy();
        });

        it("hasActiveTab() は false を返す", async () => {
            vi.stubGlobal("BroadcastChannel", undefined);

            const session = new TabSession();
            const result = await session.hasActiveTab();
            expect(result).toBe(false);
            session.destroy();
        });
    });

    describe("POST_YIELD_DELAY_MS", () => {
        it("エクスポートされていて正の数値である", () => {
            expect(POST_YIELD_DELAY_MS).toBeGreaterThan(0);
        });
    });
});
