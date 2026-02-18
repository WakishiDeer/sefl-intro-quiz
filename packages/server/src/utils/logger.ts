/**
 * logger.ts — pino 構造化ロガー
 *
 * 全てのログ出力はこのロガーを通す。
 * roomCode, participantId 等のコンテキストを必ず付与すること。
 */

import pino from "pino";

export const logger = pino({
    level: process.env["LOG_LEVEL"] ?? "info",
    transport:
        process.env["NODE_ENV"] === "development"
            ? { target: "pino-pretty" }
            : undefined,
});
