/**
 * index.ts — サーバエントリポイント（DI 組み立て）
 *
 * Express + Socket.IO サーバを起動し、各レイヤーの依存関係を注入する。
 * Infrastructure 層の具象クラスをここで組み立て、Application 層に渡す。
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// .env はモノレポルートに配置
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import {
  DEFAULT_ROOM_TIMEOUT_MS,
  ROOM_CLEANUP_INTERVAL_MS,
  RATE_LIMIT_HTTP_PER_MIN,
  RATE_LIMIT_WINDOW_MS,
} from "@self-intro-quiz/shared";
import { InMemoryRoomRepository } from "./infrastructure/InMemoryRoomRepository.js";
import { InMemoryQuizRepository } from "./infrastructure/InMemoryQuizRepository.js";
import { ClaudeQuizGenerator } from "./infrastructure/ClaudeQuizGenerator.js";
import { NodeTimerService } from "./infrastructure/NodeTimerService.js";
import { registerRoomHandlers } from "./application/roomHandlers.js";
import { registerQuizHandlers } from "./application/quizHandlers.js";
import { logger } from "./utils/logger.js";

// ============================================================
// 環境変数
// ============================================================

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
const CLIENT_URL = process.env["CLIENT_URL"] ?? "http://localhost:5173";
const ANTHROPIC_API_KEY = process.env["ANTHROPIC_API_KEY"] ?? "";
const ROOM_TIMEOUT_MS = (parseInt(process.env["ROOM_TIMEOUT_MINUTES"] ?? "30", 10)) * 60 * 1000;

// ============================================================
// Infrastructure 層の組み立て（DI）
// ============================================================

const roomRepo = new InMemoryRoomRepository();
const quizRepo = new InMemoryQuizRepository();
const CLAUDE_MODEL = process.env["CLAUDE_MODEL"] ?? undefined;
const quizGenerator = new ClaudeQuizGenerator(ANTHROPIC_API_KEY, CLAUDE_MODEL);
const timerService = new NodeTimerService();

// ============================================================
// Express セットアップ
// ============================================================

const app = express();

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// HTTP レートリミット
app.use(
  rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_HTTP_PER_MIN,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ヘルスチェック
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    activeRooms: roomRepo.getActiveRoomCount(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// Socket.IO セットアップ
// ============================================================

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
  },
});

// Socket.IO 接続ハンドラ
io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected");

  // Room & Quiz ハンドラを登録
  registerRoomHandlers(io, socket, roomRepo, quizRepo, timerService);
  registerQuizHandlers(io, socket, roomRepo, quizRepo, quizGenerator, timerService);
});

// ============================================================
// ルーム TTL 自動破棄
// ============================================================

const roomTimeoutMs = ROOM_TIMEOUT_MS || DEFAULT_ROOM_TIMEOUT_MS;

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of roomRepo.findAll()) {
    if (now - room.lastActivityAt > roomTimeoutMs) {
      io.to(code).emit("room:closed", {});
      roomRepo.delete(code);
      quizRepo.delete(code);
      timerService.cancel(code);
      timerService.cancel(`host-transfer:${code}`);
      logger.info({ roomCode: code }, "Room expired (TTL)");
    }
  }
}, ROOM_CLEANUP_INTERVAL_MS);

// ============================================================
// サーバ起動
// ============================================================

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, clientUrl: CLIENT_URL }, "Server started");
});

export { app, io, httpServer };
