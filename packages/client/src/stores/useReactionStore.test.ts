/**
 * useReactionStore.test.ts — リアクションストアのユニットテスト
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useReactionStore } from "./useReactionStore";

describe("useReactionStore", () => {
    beforeEach(() => {
        useReactionStore.getState().clearParticles();
    });

    describe("addParticle", () => {
        it("パーティクルを追加できる", () => {
            useReactionStore.getState().addParticle({
                display: "👏",
                type: "emoji",
                senderNickname: "Alice",
            });

            const { particles } = useReactionStore.getState();
            expect(particles).toHaveLength(1);
            expect(particles[0]!.display).toBe("👏");
            expect(particles[0]!.type).toBe("emoji");
            expect(particles[0]!.senderNickname).toBe("Alice");
            expect(particles[0]!.key).toMatch(/^reaction-/);
            expect(particles[0]!.x).toBeGreaterThanOrEqual(0.1);
            expect(particles[0]!.x).toBeLessThanOrEqual(0.9);
        });

        it("テキストリアクションも追加できる", () => {
            useReactionStore.getState().addParticle({
                display: "すごい!",
                type: "text",
                senderNickname: "Bob",
            });

            const { particles } = useReactionStore.getState();
            expect(particles).toHaveLength(1);
            expect(particles[0]!.display).toBe("すごい!");
            expect(particles[0]!.type).toBe("text");
        });

        it("上限を超えると古いパーティクルが破棄される", () => {
            // REACTION_MAX_VISIBLE = 30 なので 31 個追加
            for (let i = 0; i < 31; i++) {
                useReactionStore.getState().addParticle({
                    display: `emoji-${i}`,
                    type: "emoji",
                    senderNickname: "Test",
                });
            }

            const { particles } = useReactionStore.getState();
            expect(particles).toHaveLength(30);
            // 最初のパーティクルは破棄されている
            expect(particles[0]!.display).toBe("emoji-1");
            expect(particles[29]!.display).toBe("emoji-30");
        });
    });

    describe("removeParticle", () => {
        it("指定キーのパーティクルを削除できる", () => {
            useReactionStore.getState().addParticle({
                display: "👏",
                type: "emoji",
                senderNickname: "Alice",
            });
            useReactionStore.getState().addParticle({
                display: "❤️",
                type: "emoji",
                senderNickname: "Bob",
            });

            const { particles } = useReactionStore.getState();
            expect(particles).toHaveLength(2);

            useReactionStore.getState().removeParticle(particles[0]!.key);

            const { particles: remaining } = useReactionStore.getState();
            expect(remaining).toHaveLength(1);
            expect(remaining[0]!.display).toBe("❤️");
        });

        it("存在しないキーを指定しても安全", () => {
            useReactionStore.getState().addParticle({
                display: "👏",
                type: "emoji",
                senderNickname: "Alice",
            });

            useReactionStore.getState().removeParticle("non-existent-key");

            const { particles } = useReactionStore.getState();
            expect(particles).toHaveLength(1);
        });
    });

    describe("clearParticles", () => {
        it("全パーティクルをクリアする", () => {
            for (let i = 0; i < 5; i++) {
                useReactionStore.getState().addParticle({
                    display: "👏",
                    type: "emoji",
                    senderNickname: "Alice",
                });
            }

            expect(useReactionStore.getState().particles).toHaveLength(5);

            useReactionStore.getState().clearParticles();

            expect(useReactionStore.getState().particles).toHaveLength(0);
        });
    });
});
