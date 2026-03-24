/**
 * room-invitation.spec.ts — ルーム招待機能の E2E テスト
 *
 * 2 つのルームを作成し、ルーム A のホストがルーム B に招待を送信、
 * ルーム B の参加者がバナーを確認して操作するフローをテストする。
 *
 * 使い方:
 *   npx playwright test e2e/room-invitation.spec.ts --headed
 *
 * 事前にサーバ + クライアントを `npm run dev` で起動しておくこと。
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";

/** 実行ごとに一意のサフィックスを生成（4桁ランダム英数字） */
const RUN_ID = Math.random().toString(36).substring(2, 6).toUpperCase();

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

/** 既存ルームに参加する */
async function joinRoom(page: Page, roomCode: string, nickname: string): Promise<void> {
    await page.goto(`${BASE_URL}/join/${roomCode}`);
    await page.fill("#nickname", nickname);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/room\/[A-Z0-9]{6}/, { timeout: 10000 });
}

/** 招待を送信する */
async function sendInvitation(page: Page, message: string): Promise<void> {
    await page.locator('button:has-text("他のルームに招待を送る")').click();
    await page.locator('input[placeholder*="旅行好き"]').fill(message);
    // 「送信」ボタン（完全一致）— 「プロフィールを送信」とは区別する
    await page.getByRole("button", { name: "送信", exact: true }).click();
}

// ============================================================
// テスト
// ============================================================

test.describe("ルーム招待機能", () => {
    // テストを順番に実行（同時に多数のブラウザコンテキストを使わないようにする）
    test.describe.configure({ mode: "serial" });

    test("ホストが招待を送信すると、他のルームの参加者にバナーが表示される", async ({ browser }) => {
        // 3 つの独立したブラウザコンテキスト（ルームA のホスト、ルームB のホスト、ルームB のゲスト）
        const ctxA = await browser.newContext();
        const ctxB1 = await browser.newContext();
        const ctxB2 = await browser.newContext();

        const hostA = await ctxA.newPage();
        const hostB = await ctxB1.newPage();
        const guestB = await ctxB2.newPage();

        try {
            // Step 1: ルーム A を作成
            const roomCodeA = await createRoom(hostA, `HostA${RUN_ID}`);
            console.log(`✅ ルーム A 作成: ${roomCodeA}`);

            // Step 2: ルーム B を作成し、ゲストを参加させる
            const roomCodeB = await createRoom(hostB, `HostB${RUN_ID}`);
            console.log(`✅ ルーム B 作成: ${roomCodeB}`);

            await joinRoom(guestB, roomCodeB, `GstB${RUN_ID}`);
            console.log(`✅ GstB${RUN_ID} がルーム B に参加`);

            // Step 3: ルーム A のホストが招待を送信
            await sendInvitation(hostA, "こっちで面白い話してるよ！");

            // Step 4: ルーム B の参加者に招待バナーが表示されることを確認
            // ホスト B 側
            const bannerOnHostB = hostB.locator('text=📨 ルーム招待');
            await expect(bannerOnHostB).toBeVisible({ timeout: 5000 });

            // 招待メッセージが表示されている
            await expect(hostB.locator(`text=こっちで面白い話してるよ！`)).toBeVisible();
            // 招待元のホスト名が表示されている
            await expect(hostB.locator(`text=HostA${RUN_ID}`)).toBeVisible();

            // ゲスト B 側にも表示される
            const bannerOnGuestB = guestB.locator('text=📨 ルーム招待');
            await expect(bannerOnGuestB).toBeVisible({ timeout: 5000 });

            console.log("✅ 招待バナーが両方の参加者に表示された");

            // Step 5: ルーム A のホスト自身にはバナーが表示されないことを確認
            const bannerOnHostA = hostA.locator('text=📨 ルーム招待');
            // 2秒待ってバナーが出ないことを確認
            await expect(bannerOnHostA).not.toBeVisible({ timeout: 2000 });

            console.log("✅ 招待元ルームにはバナーが表示されない");
        } finally {
            await ctxA.close();
            await ctxB1.close();
            await ctxB2.close();
        }
    });

    test("バナーの『閉じる』ボタンでバナーを非表示にできる", async ({ browser }) => {
        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();

        const hostA = await ctxA.newPage();
        const hostB = await ctxB.newPage();

        try {
            const roomCodeA = await createRoom(hostA, `ClsA${RUN_ID}`);
            const roomCodeB = await createRoom(hostB, `ClsB${RUN_ID}`);

            // ルーム A のホストが招待を送信
            await sendInvitation(hostA, "テスト招待");

            // ルーム B にバナーが表示される
            const bannerContainer = hostB.locator(".fixed.bottom-4.right-4");
            await expect(bannerContainer.locator('text=📨 ルーム招待')).toBeVisible({ timeout: 5000 });

            // バナー内の「閉じる」テキストボタンで消す（×ボタンの aria-label も「閉じる」なので、テキストで区別）
            await bannerContainer.getByText("閉じる", { exact: true }).click();

            // バナーが消えたことを確認
            await expect(bannerContainer.locator('text=📨 ルーム招待')).not.toBeVisible({ timeout: 3000 });
            console.log("✅ バナーを閉じることができた");
        } finally {
            await ctxA.close();
            await ctxB.close();
        }
    });

    test("バナーの『参加する』をクリックすると招待元ルームの参加ページに遷移する", async ({ browser }) => {
        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();

        const hostA = await ctxA.newPage();
        const hostB = await ctxB.newPage();

        try {
            const roomCodeA = await createRoom(hostA, `JnA${RUN_ID}`);
            const roomCodeB = await createRoom(hostB, `JnB${RUN_ID}`);

            // ルーム A のホストが招待を送信
            await sendInvitation(hostA, "遊びに来て！");

            // ルーム B にバナーが表示される
            const bannerContainer = hostB.locator(".fixed.bottom-4.right-4");
            await expect(bannerContainer.locator('text=📨 ルーム招待')).toBeVisible({ timeout: 5000 });

            // バナー内の「参加する」ボタンをクリック
            await bannerContainer.getByRole("button", { name: "参加する" }).click();

            // 招待元ルームの参加ページに遷移することを確認
            // React Router のクライアントサイドナビゲーションなので waitUntil: "commit" を使用
            await expect(async () => {
                expect(hostB.url()).toContain(`/join/${roomCodeA}`);
            }).toPass({ timeout: 10000 });
            console.log(`✅ 招待元ルーム ${roomCodeA} の参加ページに遷移した`);
        } finally {
            await ctxA.close();
            await ctxB.close();
        }
    });

    test("招待メッセージ入力フォームのキャンセルが動作する", async ({ browser }) => {
        const ctx = await browser.newContext();
        const hostPage = await ctx.newPage();

        try {
            await createRoom(hostPage, `Cnl${RUN_ID}`);

            // 招待フォームを開く
            const inviteButton = hostPage.locator('button:has-text("他のルームに招待を送る")');
            await expect(inviteButton).toBeVisible({ timeout: 5000 });
            await inviteButton.click();

            // メッセージ入力フォームが表示される
            const messageInput = hostPage.locator('input[placeholder*="旅行好き"]');
            await expect(messageInput).toBeVisible();

            // メッセージを入力
            await messageInput.fill("テストメッセージ");

            // キャンセルボタンをクリック
            const cancelButton = hostPage.locator('button:has-text("キャンセル")');
            await cancelButton.click();

            // フォームが閉じて、元の招待ボタンが表示される
            await expect(messageInput).not.toBeVisible({ timeout: 3000 });
            await expect(inviteButton).toBeVisible();
            console.log("✅ 招待フォームをキャンセルできた");
        } finally {
            await ctx.close();
        }
    });

    test("空メッセージでは送信ボタンが無効化される", async ({ browser }) => {
        const ctx = await browser.newContext();
        const hostPage = await ctx.newPage();

        try {
            await createRoom(hostPage, `Dsa${RUN_ID}`);

            // 招待フォームを開く
            await hostPage.locator('button:has-text("他のルームに招待を送る")').click();

            // 送信ボタンが無効であることを確認（メッセージ未入力のため）
            const sendButton = hostPage.getByRole("button", { name: "送信", exact: true });
            await expect(sendButton).toBeDisabled();

            // メッセージを入力すると有効化される
            await hostPage.locator('input[placeholder*="旅行好き"]').fill("テスト");
            await expect(sendButton).toBeEnabled();

            // メッセージを空にすると再び無効化される
            await hostPage.locator('input[placeholder*="旅行好き"]').fill("");
            await expect(sendButton).toBeDisabled();
            console.log("✅ 空メッセージでは送信ボタンが無効化される");
        } finally {
            await ctx.close();
        }
    });

    test("ゲスト（非ホスト）も招待を送信できる", async ({ browser }) => {
        const ctxHost = await browser.newContext();
        const ctxGuest = await browser.newContext();
        const ctxOther = await browser.newContext();

        const hostPage = await ctxHost.newPage();
        const guestPage = await ctxGuest.newPage();
        const otherPage = await ctxOther.newPage();

        try {
            const roomCodeA = await createRoom(hostPage, `NoH${RUN_ID}`);
            await joinRoom(guestPage, roomCodeA, `Gst${RUN_ID}`);

            // 別のルームを作成（招待の受信先）
            const roomCodeB = await createRoom(otherPage, `Oth${RUN_ID}`);

            // ゲストにも招待ボタンが表示される
            await expect(guestPage.locator('button:has-text("他のルームに招待を送る")')).toBeVisible({ timeout: 5000 });

            // ゲストから招待を送信
            await sendInvitation(guestPage, "ゲストからの招待だよ！");

            // 別のルームにバナーが表示される
            await expect(otherPage.locator('text=📨 ルーム招待')).toBeVisible({ timeout: 5000 });
            // ゲストのニックネームが表示される
            await expect(otherPage.locator(`text=Gst${RUN_ID}`)).toBeVisible();
            console.log("✅ ゲストからも招待を送信できた");
        } finally {
            await ctxHost.close();
            await ctxGuest.close();
            await ctxOther.close();
        }
    });

    test("× ボタン（aria-label: 閉じる）でもバナーを閉じられる", async ({ browser }) => {
        const ctxA = await browser.newContext();
        const ctxB = await browser.newContext();

        const hostA = await ctxA.newPage();
        const hostB = await ctxB.newPage();

        try {
            await createRoom(hostA, `XbA${RUN_ID}`);
            await createRoom(hostB, `XbB${RUN_ID}`);

            // 招待送信
            await sendInvitation(hostA, "×ボタンテスト");

            // バナーが表示される
            await expect(hostB.locator('text=📨 ルーム招待')).toBeVisible({ timeout: 5000 });

            // × ボタン（aria-label="閉じる"）で閉じる
            const xButton = hostB.locator('button[aria-label="閉じる"]');
            await xButton.click();

            // バナーが消える
            await expect(hostB.locator('text=📨 ルーム招待')).not.toBeVisible({ timeout: 3000 });
            console.log("✅ ×ボタンでバナーを閉じられた");
        } finally {
            await ctxA.close();
            await ctxB.close();
        }
    });
});
