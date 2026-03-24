/**
 * capture-screenshots.ts — アプリの各画面をスクリーンショットで自動キャプチャ
 *
 * 使い方:
 *   npx playwright test e2e/capture-screenshots.ts --headed
 *
 * AI_PROVIDER=no-ai で起動しておくこと（スタブ生成器使用）。
 *   npm run dev
 *
 * screenshots/ フォルダに画像が保存される。
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const SCREENSHOT_DIR = resolve(process.cwd(), "screenshots");

// スクリーンショット保存先を作成
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const PLAYERS = [
    {
        nickname: `太郎`,
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
        nickname: `花子`,
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
        nickname: `次郎`,
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

/** スクリーンショット撮影ヘルパー */
async function screenshot(page: Page, name: string): Promise<void> {
    await page.waitForTimeout(500); // アニメーション安定待ち
    await page.screenshot({
        path: `${SCREENSHOT_DIR}/${name}.png`,
        fullPage: false,
    });
    console.log(`📸 ${name}.png saved`);
}

test("全画面スクリーンショット自動キャプチャ", async ({ browser }) => {
    test.setTimeout(300_000); // 5分

    // ============================================================
    // Part A: トップページ・ルーム作成・参加フローのスクリーンショット
    // ============================================================

    // --- 1. トップページ ---
    const ctx0 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const topPage = await ctx0.newPage();
    await topPage.goto(BASE_URL);
    await topPage.waitForTimeout(1000);
    await screenshot(topPage, "01_top_page");
    await ctx0.close();

    // ============================================================
    // Part B: 3人プレイヤーでのフルフロー
    // ============================================================

    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        contexts.push(ctx);
        pages.push(await ctx.newPage());
    }

    const [hostPage, guest1Page, guest2Page] = pages;

    // --- 2. ルーム作成画面 ---
    await hostPage.goto(BASE_URL);
    await hostPage.click('a[href="/create"]');
    await hostPage.waitForTimeout(500);
    await screenshot(hostPage, "02_create_room_page");

    // ホストがルーム作成
    await hostPage.fill("#nickname", PLAYERS[0].nickname);
    await hostPage.click('button[type="submit"]');
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });

    const roomUrl = hostPage.url();
    const roomCode = roomUrl.match(/\/room\/([A-Z0-9]{6})/)?.[1];
    if (!roomCode) throw new Error("ルームコードの取得に失敗");
    console.log(`✅ ルーム作成完了: ${roomCode}`);

    // --- 3. ロビー画面（ホスト1人のみ）---
    await hostPage.waitForTimeout(1000);
    await screenshot(hostPage, "03_lobby_host_only");

    // --- 4. ルーム参加画面 ---
    await guest1Page.goto(`${BASE_URL}/join`);
    await guest1Page.waitForTimeout(1000);
    await screenshot(guest1Page, "04_join_room_page");

    // ゲスト2人が参加
    for (let i = 1; i < 3; i++) {
        const page = pages[i];
        const player = PLAYERS[i];
        await page.goto(`${BASE_URL}/join/${roomCode}`);
        await page.fill("#nickname", player.nickname);
        await page.click('button[type="submit"]');
        await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
        console.log(`✅ ${player.nickname} がルームに参加`);
    }

    // --- 5. ロビー画面（3人参加、プロフィール未入力）---
    await hostPage.waitForTimeout(1000);
    await screenshot(hostPage, "05_lobby_3players");

    // --- 6. プロフィール入力中 ---
    // ホストがプロフィール入力中の様子をキャプチャ（後で全フィールド埋めて送信する）
    await hostPage.waitForSelector('button:has-text("プロフィールを送信")', { timeout: 10000 });
    const hostProfile = PLAYERS[0].profile;
    const hostKeys = Object.keys(hostProfile);
    // まず3フィールドだけ埋めてスクショ
    for (let j = 0; j < Math.min(3, hostKeys.length); j++) {
        const input = hostPage.locator("input[placeholder]").nth(j);
        await input.fill(hostProfile[hostKeys[j] as keyof typeof hostProfile]);
    }
    await screenshot(hostPage, "06_profile_input");

    // 残りのフィールドも埋める
    for (let j = 3; j < hostKeys.length; j++) {
        const input = hostPage.locator("input[placeholder]").nth(j);
        await input.fill(hostProfile[hostKeys[j] as keyof typeof hostProfile]);
    }
    // ホストのプロフィール送信
    await hostPage.click('button:has-text("プロフィールを送信")');
    await expect(hostPage.locator("text=プロフィールを送信しました")).toBeVisible({ timeout: 5000 });
    console.log(`✅ ${PLAYERS[0].nickname} のプロフィール送信完了`);

    // ゲスト2人のプロフィール送信
    for (let i = 1; i < 3; i++) {
        const page = pages[i];
        const player = PLAYERS[i];

        await page.waitForSelector('button:has-text("プロフィールを送信")', { timeout: 10000 });
        const profile = player.profile;
        const keys = Object.keys(profile);
        for (let j = 0; j < keys.length; j++) {
            const input = page.locator("input[placeholder]").nth(j);
            await input.fill(profile[keys[j] as keyof typeof profile]);
        }
        await page.click('button:has-text("プロフィールを送信")');
        await expect(page.locator("text=プロフィールを送信しました")).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${player.nickname} のプロフィール送信完了`);
    }

    // --- 7. プロフィール送信完了後のロビー（ホスト視点）---
    await hostPage.waitForTimeout(1000);
    await screenshot(hostPage, "07_lobby_all_submitted");

    // --- 8. クイズ生成 ---
    const generateBtn = hostPage.locator('button:has-text("クイズを生成する")');
    await generateBtn.waitFor({ state: "visible", timeout: 10000 });
    await generateBtn.click();
    console.log("🎯 クイズ生成開始");

    // 生成中の状態（一瞬なのでキャプチャは試みる）
    await hostPage.waitForTimeout(300);
    await screenshot(hostPage, "08_quiz_generating");

    // 生成完了待機（「クイズを開始する」ボタンが表示されるまで）
    const startBtn = hostPage.locator('button:has-text("クイズを開始する")');
    await startBtn.waitFor({ state: "visible", timeout: 60000 });

    // --- 9. クイズ生成完了、開始待ち ---
    await hostPage.waitForTimeout(500);
    await screenshot(hostPage, "09_quiz_ready");

    // --- 10. クイズ開始 ---
    await startBtn.click();
    console.log("🚀 クイズ開始！");

    // --- 11. クイズ出題中（Question 1）---
    // プレイヤー全員の画面を待機
    for (const page of pages) {
        await page.waitForSelector('text=/Q1/', { timeout: 10000 });
    }
    await hostPage.waitForTimeout(500);
    await screenshot(hostPage, "10_quiz_playing_host");
    await screenshot(guest1Page, "11_quiz_playing_guest");

    // --- 12. 回答（全員が回答）---
    for (let i = 0; i < 3; i++) {
        const page = pages[i];
        await answerQuestion(page);
        console.log(`✅ ${PLAYERS[i].nickname} が回答`);
    }

    // --- 13. 回答結果表示（revealing）---
    // サーバが全員回答で自動 revealing 遷移するのを待つ
    await hostPage.waitForSelector('text=💡', { timeout: 15000 }).catch(() => {
        console.log("⚠️ revealing 検出できず、待機延長");
    });
    await hostPage.waitForTimeout(1000);
    await screenshot(hostPage, "12_quiz_revealing");
    await screenshot(guest1Page, "13_quiz_revealing_guest");

    // 数問進める（revealing → next question → answer → revealing ...）
    for (let q = 1; q < 3; q++) {
        await clickButtonByJS(hostPage, "次の問題へ");
        await hostPage.waitForTimeout(1000);

        // question が表示されるまで待つ
        await hostPage.waitForSelector('text=/Q[0-9]+/', { timeout: 10000 }).catch(() => { });
        await hostPage.waitForTimeout(500);

        // 全員回答
        for (const page of pages) {
            await answerQuestion(page);
        }

        // revealing 待ち
        await hostPage.waitForSelector('text=💡', { timeout: 15000 }).catch(() => { });
        await hostPage.waitForTimeout(500);
    }

    // --- 14. もう少し進んだスコアボード付き ---
    await screenshot(hostPage, "14_quiz_mid_game");

    // 残りの問題を一気に進める
    let safety = 0;
    while (safety < 30) {
        safety++;

        // 結果ボタンがあるか確認
        const hasResult = await hostPage.locator('button:has-text("結果を見る")').isVisible().catch(() => false);
        if (hasResult) {
            await clickButtonByJS(hostPage, "結果を見る");
            console.log("🏆 結果画面へ");
            break;
        }

        // 次の問題へボタン
        const hasNext = await hostPage.locator('button:has-text("次の問題へ")').isVisible().catch(() => false);
        if (hasNext) {
            await clickButtonByJS(hostPage, "次の問題へ");
            await hostPage.waitForTimeout(800);

            await hostPage.waitForSelector('text=/Q[0-9]+/', { timeout: 10000 }).catch(() => { });
            await hostPage.waitForTimeout(500);

            for (const page of pages) {
                await answerQuestion(page);
            }

            await hostPage.waitForSelector('text=💡', { timeout: 15000 }).catch(() => { });
            await hostPage.waitForTimeout(300);
        } else {
            await hostPage.waitForTimeout(1000);
        }
    }

    // --- 16. 結果画面 ---
    await hostPage.waitForSelector('text=結果発表', { timeout: 15000 }).catch(() => {
        console.log("⚠️ 結果画面テキスト未検出、スクショは撮影");
    });
    await hostPage.waitForTimeout(2000);
    await screenshot(hostPage, "15_result_page");
    await screenshotFull(hostPage, "16_result_page_full");

    console.log("\n🎉 スクリーンショット撮影完了！");
    console.log(`   保存先: ${SCREENSHOT_DIR}`);

    for (const ctx of contexts) {
        await ctx.close();
    }
});

/** JavaScriptでボタンをクリック（overlay回避） */
async function clickButtonByJS(page: Page, textMatch: string): Promise<void> {
    await page.evaluate((text) => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
            if (btn.textContent?.includes(text)) {
                btn.click();
                return;
            }
        }
    }, textMatch);
}

/** 選択肢をクリックして回答する */
async function answerQuestion(page: Page): Promise<void> {
    try {
        await page.waitForTimeout(300);
        // 4択の場合: ChoiceButton はバッジ(A/B/C/D) + ラベルテキストを含む button
        // バッジ "A" を含むボタンにマッチさせる
        const fourChoice = page.locator("button").filter({ has: page.locator("span", { hasText: /^A$/ }) }).first();
        if (await fourChoice.isVisible().catch(() => false)) {
            await fourChoice.click({ timeout: 3000 });
            return;
        }
        // ⭕❌ボタン: "はい" テキストを含むボタン
        const yesBtn = page.locator("button").filter({ hasText: "はい" }).first();
        if (await yesBtn.isVisible().catch(() => false)) {
            await yesBtn.click({ timeout: 3000 });
            return;
        }
    } catch {
        // already answered or not visible
    }
}

/** フルページスクリーンショット */
async function screenshotFull(page: Page, name: string): Promise<void> {
    await page.waitForTimeout(500);
    await page.screenshot({
        path: `${SCREENSHOT_DIR}/${name}.png`,
        fullPage: true,
    });
    console.log(`📸 ${name}.png (full page) saved`);
}
