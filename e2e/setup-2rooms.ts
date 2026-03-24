/**
 * setup-2rooms.ts — 2 部屋 × 3 人ずつ（計 6 ブラウザ）を自動セットアップ
 *
 * ルーム招待機能のテストや、複数ルーム間のインタラクションを手動確認する際に使用する。
 *
 * 使い方:
 *   npx playwright test e2e/setup-2rooms.ts --headed
 *
 * 事前にサーバ + クライアントを `npm run dev` で起動しておくこと。
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

/** 実行ごとに一意のサフィックスを生成（4桁ランダム英数字） */
const RUN_ID = Math.random().toString(36).substring(2, 6).toUpperCase();

/** ルームごとの参加者データ */
const ROOMS = [
    {
        label: "ルーム A",
        players: [
            {
                nickname: `太郎${RUN_ID}`,
                isHost: true,
                profile: {
                    hometown: "東京都渋谷区",
                    hobbies: "プログラミング、カフェ巡り",
                    skills: "TypeScript、料理",
                    favorite_food: "寿司",
                    surprising_fact: "実は元プロゲーマー",
                    free_text: "よろしくお願いします！",
                },
            },
            {
                nickname: `花子${RUN_ID}`,
                isHost: false,
                profile: {
                    hometown: "大阪府堺市",
                    hobbies: "読書、ヨガ、映画鑑賞",
                    skills: "英語、ピアノ",
                    favorite_food: "たこ焼き",
                    surprising_fact: "3カ国に住んだことがある",
                    free_text: "大阪からリモート参加です",
                },
            },
            {
                nickname: `次郎${RUN_ID}`,
                isHost: false,
                profile: {
                    hometown: "北海道札幌市",
                    hobbies: "スノボ、キャンプ、写真",
                    skills: "デザイン、スキー",
                    favorite_food: "ジンギスカン",
                    surprising_fact: "犬を5匹飼っている",
                    free_text: "北海道の話ならお任せ！",
                },
            },
        ],
    },
    {
        label: "ルーム B",
        players: [
            {
                nickname: `美咲${RUN_ID}`,
                isHost: true,
                profile: {
                    hometown: "福岡県福岡市",
                    hobbies: "ランニング、陶芸",
                    skills: "Python、データ分析",
                    favorite_food: "もつ鍋",
                    surprising_fact: "フルマラソン完走経験あり",
                    free_text: "博多っ子です！",
                },
            },
            {
                nickname: `健太${RUN_ID}`,
                isHost: false,
                profile: {
                    hometown: "愛知県名古屋市",
                    hobbies: "ギター、釣り、DIY",
                    skills: "React、木工",
                    favorite_food: "味噌カツ",
                    surprising_fact: "自作 PC を10台組んだ",
                    free_text: "名古屋飯の話で盛り上がろう",
                },
            },
            {
                nickname: `さくら${RUN_ID}`,
                isHost: false,
                profile: {
                    hometown: "京都府京都市",
                    hobbies: "茶道、旅行、写真",
                    skills: "フランス語、書道",
                    favorite_food: "抹茶スイーツ",
                    surprising_fact: "20カ国旅行した",
                    free_text: "京都のおすすめスポット教えます",
                },
            },
        ],
    },
] as const;

// ============================================================
// ヘルパー関数
// ============================================================

/** ルームを作成し、ルームコードを返す */
async function createRoom(page: Page, nickname: string): Promise<string> {
    await page.goto(BASE_URL);
    await page.click('a[href="/create"]');
    await page.fill("#nickname", nickname);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

    const url = page.url();
    const code = url.match(/\/room\/([A-Z0-9]{6})/)?.[1];
    if (!code) throw new Error("ルームコードの取得に失敗しました");
    return code;
}

/** ルームに参加する */
async function joinRoom(page: Page, roomCode: string, nickname: string): Promise<void> {
    await page.goto(`${BASE_URL}/join/${roomCode}`);
    await page.fill("#nickname", nickname);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
}

/** プロフィールを入力して送信する */
async function submitProfile(page: Page, profile: Record<string, string>): Promise<void> {
    await page.waitForSelector('button:has-text("プロフィールを送信")', {
        timeout: 10000,
    });

    const keys = Object.keys(profile);
    for (let i = 0; i < keys.length; i++) {
        const value = profile[keys[i]];
        const input = page.locator("input[placeholder]").nth(i);
        await input.fill(value);
    }

    await page.click('button:has-text("プロフィールを送信")');

    await expect(
        page.locator("text=プロフィールを送信しました"),
    ).toBeVisible({ timeout: 5000 });
}

// ============================================================
// テスト
// ============================================================

test("2 部屋 × 3 人ずつ ルーム作成〜プロフィール送信まで自動セットアップ", async ({
    browser,
}) => {
    // 6 ブラウザ × プロフィール入力があるため、テスト全体のタイムアウトを延長
    test.setTimeout(180_000);
    /** ルームごとの { roomCode, contexts, pages } */
    const roomData: {
        label: string;
        roomCode: string;
        contexts: BrowserContext[];
        pages: Page[];
    }[] = [];

    // ============================================================
    // Step 1: 各ルームを作成し、参加者を配置
    // ============================================================
    for (const room of ROOMS) {
        const contexts: BrowserContext[] = [];
        const pages: Page[] = [];

        // ブラウザコンテキスト 3 つ（独立した localStorage / Cookie）
        for (let i = 0; i < room.players.length; i++) {
            const ctx = await browser.newContext();
            contexts.push(ctx);
            pages.push(await ctx.newPage());
        }

        // ホストがルームを作成
        const host = room.players[0];
        const roomCode = await createRoom(pages[0], host.nickname);
        console.log(`\n✅ ${room.label} 作成完了: ${roomCode} (ホスト: ${host.nickname})`);

        // ゲストが参加
        for (let i = 1; i < room.players.length; i++) {
            const player = room.players[i];
            await joinRoom(pages[i], roomCode, player.nickname);
            console.log(`   ✅ ${player.nickname} が ${room.label} に参加`);
        }

        roomData.push({ label: room.label, roomCode, contexts, pages });
    }

    // ============================================================
    // Step 2: 全員がプロフィールを入力して送信
    // ============================================================
    for (let r = 0; r < ROOMS.length; r++) {
        const room = ROOMS[r];
        const { pages } = roomData[r];

        for (let i = 0; i < room.players.length; i++) {
            const player = room.players[i];
            await submitProfile(pages[i], player.profile as unknown as Record<string, string>);
            console.log(`   ✅ ${player.nickname} のプロフィール送信完了`);
        }
    }

    // ============================================================
    // 完了サマリー
    // ============================================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 セットアップ完了！ 2 部屋 × 3 人のルームが準備できました");
    console.log("=".repeat(60));

    for (const { label, roomCode } of roomData) {
        console.log(`   ${label}: ${roomCode}`);
    }

    console.log(`   RUN_ID: ${RUN_ID}`);
    console.log("   ブラウザは開いたままです（手動で操作を続けてください）");
    console.log("=".repeat(60) + "\n");

    // ブラウザを開いたままにする（手動操作用）
    await roomData[0].pages[0].pause();
});
