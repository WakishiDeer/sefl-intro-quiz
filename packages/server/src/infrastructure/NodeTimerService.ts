/**
 * NodeTimerService — タイマー管理のインフラ実装
 *
 * setTimeout/clearTimeout をラップし、ドメインモデルから Node.js 固有の
 * タイマーハンドルを隔離する。キーベースでタイマーを管理。
 */

export class NodeTimerService {
    private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

    /**
     * 指定キーでタイマーをスケジュールする。
     * 同じキーの既存タイマーはキャンセルされる。
     *
     * @param key - タイマーの識別キー（例: roomCode）
     * @param delayMs - 遅延時間 (ms)
     * @param callback - タイマー発火時のコールバック
     */
    schedule(key: string, delayMs: number, callback: () => void): void {
        this.cancel(key);
        this.timers.set(
            key,
            setTimeout(() => {
                this.timers.delete(key);
                callback();
            }, delayMs),
        );
    }

    /** 指定キーのタイマーをキャンセルする */
    cancel(key: string): void {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
    }

    /** 指定キーのタイマーが存在するか */
    has(key: string): boolean {
        return this.timers.has(key);
    }

    /** 全タイマーをキャンセルする（シャットダウン時等） */
    cancelAll(): void {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}
