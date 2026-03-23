import { defineConfig } from "@playwright/test";

/**
 * playwright.config.ts — E2E テスト / 自動セットアップ用設定
 *
 * 使い方:
 *   npx playwright test e2e/setup-3players.ts --headed
 *
 * pnpm dev が既に起動済みならそちらを再利用。
 * 未起動なら webServer 設定でサーバ + クライアントを自動起動する。
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.ts",
  timeout: 120_000,
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    // headed モードで実行する場合、ブラウザ操作が見える速度に
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  // pnpm dev（サーバ + クライアント）を自動起動
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
  // E2E セットアップは Chromium だけで十分
  projects: [
    {
      name: "setup",
      use: { browserName: "chromium" },
    },
  ],
});
