/**
 * socket.ts — Socket.IO クライアント初期化
 *
 * サーバとの WebSocket 接続を一元管理する。
 * autoConnect: false で手動接続し、ルーム操作時に connect() する。
 */

import { io, Socket } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3002";

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});
