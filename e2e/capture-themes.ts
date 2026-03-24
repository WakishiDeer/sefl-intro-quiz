/**
 * capture-themes.ts — 5テーマのスクリーンショットを自動キャプチャ
 *
 * 使い方:
 *   npx playwright test e2e/capture-themes.ts --headed
 *
 * サーバ + クライアントが起動済みであること（npm run dev）。
 * docs/presentation/screenshots/ フォルダに画像が保存される。
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { mkdirSync } from "fs";
import { resolve } from "path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const SCREENSHOT_DIR = resolve(process.cwd(), "docs/presentation/screenshots");

mkdirSync(SCREENSHOT_DIR, { recursive: true });

const THEMES = ["subtle", "fun", "cyber", "party", "sakura"] as const;

const THEME_LABELS: Record<string, string> = {
    subtle: "控えめ",
    fun: "楽しい",
    cyber: "サイバー",
    party: "パーティー",
    sakura: "サクラ",
};

const PLAYERS = [
    {
        nickname: "太郎",
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
        nickname: "花子",
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
        nickname: "次郎",
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

async function screenshot(page: Page, name: string): Promise<void> {
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: false });
    console.log(`📸 ${name}.png saved`);
}

/** テーマボタンを直接クリックして切り替え */
async function clickThemeButton(hostPage: Page, themeName: string): Promise<void> {
    const themeSection = hostPage.locator('text=演出テーマ');
    if (await themeSection.isVisible().catch(() => false)) {
        await themeSection.scrollIntoViewIfNeeded();
    }
    const btn = hostPage.locator(`button:has-text("${THEME_LABELS[themeName]}")`);
    if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await hostPage.waitForTimeout(1500);
    }
}

/** JavaScriptでボタンをクリック（overlay回避） */
async function clickButtonByJS(page: Page, textMatch: string): Promise<void> {
    await page.evaluate((text) => {
        const buttons = document.querySelectorAll("button");
        for (const btn of buttons) {
            if (btn.textContent?.includes(text)) { btn.click(); return; }
        }
    }, textMatch);
}

/** 選択肢をクリックして回答する */
async function answerQuestion(page: Page): Promise<void> {
    try {
        await page.waitForTimeout(300);
        const fourChoice = page.locator("button").filter({ has: page.locator("span", { hasText: /^A$/ }) }).first();
        if (await fourChoice.isVisible().catch(() => false)) { await fourChoice.click({ timeout: 3000 }); return; }
        const yesBtn = page.locator("button").filter({ hasText: "はい" }).first();
        if (await yesBtn.isVisible().catch(() => false)) { await yesBtn.click({ timeout: 3000 }); return; }
    } catch { /* skip */ }
}

test("5テーマのスクリーンショットキャプチャ", async ({ browser }) => {
    test.setTimeout(600_000);

    const contexts: BrowserContext[] = [];
    const pages: Page[] = [];

    for (let i = 0; i < 3; i++) {
        const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        contexts.push(ctx);
        pages.push(await ctx.newPage());
    }

    const [hostPage, guest1Page, guest2Page] = pages;

    // ルーム作成 + 参加
    await hostPage.goto(BASE_URL);
    await hostPage.click('a[href="/create"]');
    await hostPage.fill("#nickname", PLAYERS[0].nickname);
    await hostPage.click('button[type="submit"]');
    await hostPage.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
    const roomCode = hostPage.url().match(/\/room\/([A-Z0-9]{6})/)?.[1];
    if (!roomCode) throw new Error("ルームコード取得失敗");
    console.log(`✅ ルーム作成: ${roomCode}`);

    for (let i = 1; i < 3; i++) {
        await pages[i].goto(`${BASE_URL}/join/${roomCode}`);
        await pages[i].fill("#nickname", PLAYERS[i].nickname);
        await pages[i].click('button[type="submit"]');
        await pages[i].waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
        console.log(`✅ ${PLAYERS[i].nickname} 参加`);
    }

    // プロフィール送信
    for (let i = 0; i < 3; i++) {
        const page = pages[i];
        await page.waitForSelector('button:has-text("プロフィールを送信")', { timeout: 10000 });
        const profile = PLAYERS[i].profile;
        const keys = Object.keys(profile);
        for (let j = 0; j < keys.length; j++) {
            await page.locator("input[placeholder]").nth(j).fill(profile[keys[j] as keyof typeof profile]);
        }
        await page.click('button:has-text("プロフィールを送信")');
        await expect(page.locator("text=プロフィールを送信しました")).toBeVisible({ timeout: 5000 });
    }

    // ============================================================
    // ロビーで各テーマのスクリーンショット
    // ============================================================
    console.log("\n🎨 テーマ別ロビースクリーンショット開始");

    for (const themeName of THEMES) {
        await clickThemeButton(hostPage, themeName);
        await hostPage.waitForTimeout(1000);
        await hostPage.evaluate(() => window.scrollTo(0, 0));
        await hostPage.waitForTimeout(500);
        await screenshot(hostPage, `theme_${themeName}_lobby`);

        // ゲスト視点も撮影（テーマ選択ボタンが無効で見える）
        await guest1Page.evaluate(() => window.scrollTo(0, 0));
        await screenshot(guest1Page, `theme_${themeName}_guest`);

        console.log(`  🎨 ${themeName} 撮影完了`);
    }

    // ============================================================
    // クイズ生成 & 全テーマでクイズ画面撮影
    // ============================================================
    // subtle でクイズ生成
    await clickThemeButton(hostPage, "subtle");

    const generateBtn = hostPage.locator('button:has-text("クイズを生成する")');
    await generateBtn.waitFor({ state: "visible", timeout: 10000 });
    await generateBtn.click();
    console.log("🎯 クイズ生成開始");

    const startBtn = hostPage.locator('button:has-text("クイズを開始する")');
    await startBtn.waitFor({ state: "visible", timeout: 60000 });
    await startBtn.click();
    console.log("🚀 クイズ開始！");

    for (const page of pages) {
        await page.waitForSelector('text=/Q1/', { timeout: 10000 });
    }
    await hostPage.waitForTimeout(500);

    // Q1 出題中のスクリーンショット（subtle テーマ = デフォルト）
    await screenshot(hostPage, "theme_subtle_quiz");

    // 全員回答して revealing へ
    for (const page of pages) { await answerQuestion(page); }
    await hostPage.waitForSelector('text=💡', { timeout: 15000 }).catch(() => { });
    await hostPage.waitForTimeout(1000);
    await screenshot(hostPage, "theme_subtle_revealing");

    // 残りの問題を消化して結果画面へ
    let safety = 0;
    while (safety < 30) {
        safety++;
        const hasResult = await hostPage.locator('button:has-text("結果を見る")').isVisible().catch(() => false);
        if (hasResult) { await clickButtonByJS(hostPage, "結果を見る"); console.log("🏆 結果画面へ"); break; }
        const hasNext = await hostPage.locator('button:has-text("次の問題へ")').isVisible().catch(() => false);
        if (hasNext) {
            await clickButtonByJS(hostPage, "次の問題へ");
            await hostPage.waitForTimeout(800);
            await hostPage.waitForSelector('text=/Q[0-9]+/', { timeout: 10000 }).catch(() => { });
            await hostPage.waitForTimeout(500);
            for (const page of pages) { await answerQuestion(page); }
            await hostPage.waitForSelector('text=💡', { timeout: 15000 }).catch(() => { });
            await hostPage.waitForTimeout(300);
        } else { await hostPage.waitForTimeout(1000); }
    }

    await hostPage.waitForSelector('text=結果発表', { timeout: 15000 }).catch(() => { });
    await hostPage.waitForTimeout(1500);
    await screenshot(hostPage, "theme_subtle_result");

    console.log("\n🎉 テーマスクリーンショット撮影完了！");
    console.log(`   保存先: ${SCREENSHOT_DIR}`);

    for (const ctx of contexts) { await ctx.close(); }
});
