/**
 * setup-3players.ts — ブラウザ 3 つを自動で立ち上げ、ルーム作成〜プロフィール入力まで完了させる
 *
 * 使い方:
 *   npx playwright test e2e/setup-3players.ts --headed
 *
 * 事前にサーバ + クライアントを `npm run dev` で起動しておくこと。
 *
 * 毎回ランダムなサフィックスをニックネームに付与するため、
 * 連続実行しても前回のセッションと衝突しない。
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

/** 実行ごとに一意のサフィックスを生成（4桁ランダム英数字） */
const RUN_ID = Math.random().toString(36).substring(2, 6).toUpperCase();

/** 参加者ごとのテストデータ（ニックネームに RUN_ID を付与して毎回一意にする） */
const PLAYERS = [
    {
        nickname: `太郎${RUN_ID}`,
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
        profile: {
            hometown: "北海道札幌市",
            hobbies: "スノボ、キャンプ、写真",
            skills: "デザイン、スキー",
            favorite_food: "ジンギスカン",
            surprising_fact: "犬を5匹飼っている",
            free_text: "北海道の話ならお任せ！",
        },
    },
] as const;

test("3人のプレイヤーでルーム作成〜プロフィール送信まで自動セットアップ", async ({
    browser,
}) => {
    // ブラウザコンテキスト 3 つ（独立した localStorage / Cookie）
    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext();
        contexts.push(ctx);
        pages.push(await ctx.newPage());
    }

    const [hostPage, guest1Page, guest2Page] = pages;

    // ============================================================
    // Step 1: ホストがルームを作成
    // ============================================================
    await hostPage.goto(BASE_URL);
    await hostPage.click('a[href="/create"]');
    await hostPage.fill("#nickname", PLAYERS[0].nickname);
    await hostPage.click('button[type="submit"]');

    // /room/:roomCode に遷移するまで待機
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
    const roomUrl = hostPage.url();
    const roomCode = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1];
    expect(roomCode).toBeTruthy();

    console.log(`\n✅ ルーム作成完了: ${roomCode}`);
    console.log(`   URL: ${roomUrl}\n`);

    // ============================================================
    // Step 2: ゲスト 2 人がルームに参加
    // ============================================================
    for (let i = 1; i < 3; i++) {
        const page = pages[i];
        const player = PLAYERS[i];

        await page.goto(`${BASE_URL}/join/${roomCode}`);
        await page.fill("#nickname", player.nickname);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

        console.log(`✅ ${player.nickname} がルームに参加`);
    }

    // ============================================================
    // Step 3: 全員がプロフィールを入力して送信
    // ============================================================
    for (let i = 0; i < 3; i++) {
        const page = pages[i];
        const player = PLAYERS[i];

        // プロフィールフォームが表示されるまで待機
        await page.waitForSelector('button:has-text("プロフィールを送信")', {
            timeout: 10000,
        });

        // 各フィールドに値を入力（label テキストで特定）
        for (const [fieldId, value] of Object.entries(player.profile)) {
            // input は label の次の sibling。fieldId に対応するプレースホルダーで探す
            const input = page.locator(`input[placeholder]`).nth(
                Object.keys(player.profile).indexOf(fieldId),
            );
            await input.fill(value);
        }

        // 送信
        await page.click('button:has-text("プロフィールを送信")');

        // 送信成功メッセージを確認
        await expect(
            page.locator("text=プロフィールを送信しました"),
        ).toBeVisible({ timeout: 5000 });

        console.log(`✅ ${player.nickname} のプロフィール送信完了`);
    }

    console.log("\n🎉 セットアップ完了！ 3 人がルームに参加しプロフィール入力済みです");
    console.log(`   ルームコード: ${roomCode}  (RUN_ID: ${RUN_ID})`);
    console.log("   ブラウザは開いたままです（手動で操作を続けてください）\n");

    // ブラウザを開いたままにする（手動操作用）
    // Playwright はテスト終了時にブラウザを閉じるので、pause() で止める
    await hostPage.pause();
});
