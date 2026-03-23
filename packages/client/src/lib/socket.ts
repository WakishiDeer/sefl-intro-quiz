/**
 * socket.ts — Socket.IO クライアント初期化
 *
 * サーバとの WebSocket 接続を一元管理する。
 * autoConnect: false で手動接続し、ルーム操作時に connect() する。
 */

import { io, Socket } from "socket.io-client";

// 本番環境: 同一オリジン接続（Express が静的ファイルも配信するため）
// 開発環境: VITE_SERVER_URL で指定されたサーバーへ直接接続
const SERVER_URL = import.meta.env.PROD
  ? window.location.origin
  : (import.meta.env.VITE_SERVER_URL || "http://localhost:3001");

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
