/**
 * RoomPage — ルームメインページ
 *
 * phase に応じてロビー / クイズ進行 / 結果画面を切り替える。
 * URL 遷移なしでリアルタイム状態遷移を表現する。
 */

import { useParams, Navigate } from "react-router";
import { useRoomStore } from "../stores/useRoomStore";
import { useQuizStore } from "../stores/useQuizStore";
import { LobbyView } from "../components/LobbyView";
import { QuizView } from "../components/QuizView";
import { ResultView } from "../components/ResultView";

export function RoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const phase = useRoomStore((s) => s.phase);
  const storeRoomCode = useRoomStore((s) => s.roomCode);
  const isConnected = useRoomStore((s) => s.isConnected);

  // ルームに参加していない場合はトップに戻す
  if (!storeRoomCode || storeRoomCode !== roomCode) {
    return <Navigate to={`/join/${roomCode}`} replace />;
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100">
      {/* 接続断バナー */}
      {!isConnected && (
        <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
          接続が切れました。再接続中...
        </div>
      )}

      {/* フェーズに応じた表示切替 */}
      {(phase === "lobby" || phase === "generating") && <LobbyView />}
      {(phase === "playing" || phase === "revealing") && <QuizView />}
      {phase === "finished" && <ResultView />}
    </div>
  );
}
