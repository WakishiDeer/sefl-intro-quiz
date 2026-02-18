/**
 * App.tsx — アプリケーションルート
 *
 * React Router のルーティング定義と Socket.IO リスナーのセットアップ。
 */

import { Routes, Route } from "react-router";
import { useSocket } from "./hooks/useSocket.js";
import { Toast } from "./components/Toast.js";
import { TopPage } from "./pages/TopPage.js";
import { CreateRoomPage } from "./pages/CreateRoomPage.js";
import { JoinRoomPage } from "./pages/JoinRoomPage.js";
import { RoomPage } from "./pages/RoomPage.js";

export function App() {
  // Socket.IO イベントリスナーをセットアップ
  useSocket();

  return (
    <>
      <Toast />
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/create" element={<CreateRoomPage />} />
        <Route path="/join" element={<JoinRoomPage />} />
        <Route path="/join/:roomCode" element={<JoinRoomPage />} />
        <Route path="/room/:roomCode" element={<RoomPage />} />
      </Routes>
    </>
  );
}
