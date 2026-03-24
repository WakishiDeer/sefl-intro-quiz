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
import { AzureOpenAIQuizGenerator } from "./infrastructure/AzureOpenAIQuizGenerator.js";
import { AzureOpenAIProfileFieldSuggester } from "./infrastructure/AzureOpenAIProfileFieldSuggester.js";
import { StubQuizGenerator } from "./infrastructure/StubQuizGenerator.js";
import { StubProfileFieldSuggester } from "./infrastructure/StubProfileFieldSuggester.js";
import { NodeTimerService } from "./infrastructure/NodeTimerService.js";
import { registerRoomHandlers } from "./application/roomHandlers.js";
import { broadcastRoomList } from "./application/roomHandlers.js";
import { registerQuizHandlers } from "./application/quizHandlers.js";
import { registerAIRequestHandlers } from "./application/aiRequestHandlers.js";
import { logger } from "./utils/logger.js";

// ============================================================
// 環境変数
// ============================================================

const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
const CLIENT_URL = process.env["CLIENT_URL"] ?? "http://localhost:5173";
const AI_PROVIDER = process.env["AI_PROVIDER"] ?? "no-ai";
const AZURE_OPENAI_ENDPOINT = process.env["AZURE_OPENAI_ENDPOINT"] ?? "";
const AZURE_OPENAI_API_KEY = process.env["AZURE_OPENAI_API_KEY"] ?? "";
const AZURE_OPENAI_DEPLOYMENT = process.env["AZURE_OPENAI_DEPLOYMENT"] ?? "gpt-51";
const ROOM_TIMEOUT_MS = (parseInt(process.env["ROOM_TIMEOUT_MINUTES"] ?? "30", 10)) * 60 * 1000;

// ============================================================
// Infrastructure 層の組み立て（DI）
// AI_PROVIDER 環境変数で azure-openai / no-ai を切り替え
// ============================================================

const roomRepo = new InMemoryRoomRepository();
const quizRepo = new InMemoryQuizRepository();

const { quizGenerator, fieldSuggester } = (() => {
  if (AI_PROVIDER === "azure-openai") {
    logger.info({ provider: "azure-openai", deployment: AZURE_OPENAI_DEPLOYMENT }, "Using Azure OpenAI");
    return {
      quizGenerator: new AzureOpenAIQuizGenerator(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT),
      fieldSuggester: new AzureOpenAIProfileFieldSuggester(AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT),
    };
  }
  // デフォルト: スタブ（no-ai）
  logger.info({ provider: "no-ai" }, "Using stub implementations (no AI)");
  return {
    quizGenerator: new StubQuizGenerator(),
    fieldSuggester: new StubProfileFieldSuggester(),
  };
})();

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

// 本番環境（同一オリジン配信）では CORS 不要
const corsOrigin = CLIENT_URL || undefined;
const io = new Server(httpServer, {
  ...(corsOrigin ? { cors: { origin: corsOrigin, methods: ["GET", "POST"] } } : {}),
});

// ============================================================
// 本番環境: クライアント静的ファイル配信
// Socket.IO のパス（/socket.io/）がハンドリングされた後に登録する
// ============================================================

if (process.env["NODE_ENV"] === "production") {
  const clientDistPath = resolve(__dirname, "../../client/dist");
  // HOW TO USE (presentation) を /howto で配信
  const presentationPath = resolve(__dirname, "../../../docs/presentation");
  app.use("/howto", express.static(presentationPath));
  app.use(express.static(clientDistPath));
  // SPA フォールバック: API・Socket.IO 以外のリクエストは index.html へ
  app.get("*", (_req, res) => {
    res.sendFile(resolve(clientDistPath, "index.html"));
  });
}

// Socket.IO 接続ハンドラ
io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Client connected");

  // Room & Quiz & AI Request ハンドラを登録
  registerRoomHandlers(io, socket, roomRepo, quizRepo, timerService);
  registerQuizHandlers(io, socket, roomRepo, quizRepo, quizGenerator, timerService);
  registerAIRequestHandlers(io, socket, roomRepo, fieldSuggester, timerService);
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
      logger.info({ roomCode: code }, "Room expired (TTL)");
    }
  }
  // TTL で削除されたルームがあればルーム一覧を更新
  broadcastRoomList(io, roomRepo);
}, ROOM_CLEANUP_INTERVAL_MS);

// ============================================================
// サーバ起動
// ============================================================

httpServer.listen(PORT, () => {
  logger.info({ port: PORT, clientUrl: CLIENT_URL }, "Server started");
});

export { app, io, httpServer };
