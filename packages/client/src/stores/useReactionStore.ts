/**
 * useReactionStore — リアクションパーティクルの状態管理
 *
 * 受信したリアクションを一時的にキューに保持し、パーティクルエフェクトで表示する。
 * パーティクルは一定時間後に自動的に消滅する、エフェメラルな状態。
 */

import { create } from "zustand";
import { REACTION_MAX_VISIBLE } from "@self-intro-quiz/shared";
import type { ReactionType } from "@self-intro-quiz/shared";

/** 画面上に表示中のリアクションパーティクル */
export interface ReactionParticle {
    /** パーティクル固有 ID（表示管理用） */
    key: string;
    /** 表示文字列（絵文字 or テキスト） */
    display: string;
    /** リアクション種別 */
    type: ReactionType;
    /** 送信者のニックネーム */
    senderNickname: string;
    /** パーティクル出現時刻（ms） */
    createdAt: number;
    /** 水平位置（0〜1、ランダム） */
    x: number;
    /** true の場合、等幅フォント（ターミナル風）で描画する */
    mono?: boolean;
}

interface ReactionState {
    /** 表示中のパーティクル一覧 */
    particles: ReactionParticle[];

    /** パーティクルを追加（上限超過時は古い順に破棄） */
    addParticle: (particle: Omit<ReactionParticle, "key" | "createdAt" | "x">) => void;

    /** 指定キーのパーティクルを削除（アニメーション終了時に呼ぶ） */
    removeParticle: (key: string) => void;

    /** 全パーティクルをクリア */
    clearParticles: () => void;
}

let particleCounter = 0;

export const useReactionStore = create<ReactionState>((set) => ({
    particles: [],

    addParticle: (particle) => {
        const key = `reaction-${++particleCounter}`;
        const newParticle: ReactionParticle = {
            ...particle,
            key,
            createdAt: Date.now(),
            x: 0.1 + Math.random() * 0.8, // 画面の10%〜90%の範囲にランダム配置
        };

        set((state) => {
            const updated = [...state.particles, newParticle];
            // 上限超過時は古い順に破棄
            if (updated.length > REACTION_MAX_VISIBLE) {
                return { particles: updated.slice(updated.length - REACTION_MAX_VISIBLE) };
            }
            return { particles: updated };
        });
    },

    removeParticle: (key) => {
        set((state) => ({
            particles: state.particles.filter((p) => p.key !== key),
        }));
    },

    clearParticles: () => set({ particles: [] }),
}));
