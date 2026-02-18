/**
 * JoinRoomPage — ルーム参加ページ
 *
 * Room Code + ニックネームを入力して既存ルームに参加する。
 * URL パラメータで roomCode を受け取ることも可能。
 * アクティブなルーム一覧をリアルタイムで表示し、クリックでルームコード自動入力。
 *
 * ニックネーム重複チェックは二段構え:
 * 1. 楽観的チェック: ルーム一覧の参加者データからローカルで即座に判定
 * 2. サーバーチェック: room:check-nickname イベントで最終確認（デバウンス 300ms）
 * 参加ボタン押下後は room:join で最終バリデーション。
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS, S2C_EVENTS, NicknameSchema, RoomCodeSchema } from "@self-intro-quiz/shared";
import type { RoomSummary, RoomListPayload, NicknameResultPayload, RoomErrorPayload } from "@self-intro-quiz/shared";
import { useRoomStore } from "../stores/useRoomStore.js";
import { RoomListPanel } from "../components/RoomListPanel.js";

/** デバウンス間隔（ms）— ニックネーム重複チェックのサーバー問い合わせ頻度を制限 */
const NICKNAME_CHECK_DEBOUNCE_MS = 300;

/** サーバーエラーコードからユーザー向けメッセージへのマッピング */
const ERROR_MESSAGES: Record<string, string> = {
  NICKNAME_TAKEN: "このニックネームは既に使われています",
  ROOM_FULL: "ルームが満員です",
  ROOM_NOT_FOUND: "ルームが見つかりません",
  VALIDATION_ERROR: "入力内容が不正です",
};

export function JoinRoomPage() {
  const { roomCode: urlRoomCode } = useParams<{ roomCode?: string }>();
  const [roomCode, setRoomCode] = useState(urlRoomCode ?? "");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  /** ニックネームが使用不可であることが判明しているか（重複検出フラグ） */
  const [isNicknameTaken, setIsNicknameTaken] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useRef で最新の roomCode / nickname を保持し、
  // onNicknameResult リスナーが古いクロージャを参照する問題を回避する
  const roomCodeRef = useRef(roomCode);
  const nicknameRef = useRef(nickname);
  roomCodeRef.current = roomCode;
  nicknameRef.current = nickname;

  // ルーム一覧のリアルタイム購読 + ニックネーム結果リスナー + エラーリスナー
  // 依存配列は空 — マウント時に1回だけ登録し、ref で最新値を参照する
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const onRoomList = (payload: RoomListPayload) => {
      setRooms(payload.rooms);
    };

    // サーバーからのニックネーム重複チェック結果
    const onNicknameResult = (payload: NicknameResultPayload) => {
      // 現在の入力と一致する結果のみ反映（古いリクエストの結果を無視）
      const currentCode = roomCodeRef.current.toUpperCase();
      const currentNick = nicknameRef.current;
      if (payload.roomCode === currentCode && payload.nickname.toLowerCase() === currentNick.toLowerCase()) {
        if (!payload.available) {
          setIsNicknameTaken(true);
          setError("このニックネームは既に使われています");
        } else {
          setIsNicknameTaken(false);
          // 他のエラー（Zod バリデーション等）がなければクリア
          setError((prev) =>
            prev === "このニックネームは既に使われています" ? null : prev,
          );
        }
      }
    };

    // サーバーからの参加エラー（NICKNAME_TAKEN, ROOM_FULL 等）
    const onRoomError = (payload: RoomErrorPayload) => {
      const message = ERROR_MESSAGES[payload.code] ?? payload.message;
      setError(message);
      setIsSubmitting(false);

      if (payload.code === "NICKNAME_TAKEN") {
        setIsNicknameTaken(true);
      }

      // ROOM_NOT_FOUND の場合はクレデンシャルをリセット
      if (payload.code === "ROOM_NOT_FOUND") {
        useRoomStore.getState().reset();
      }
    };

    socket.on(S2C_EVENTS.ROOM_LIST, onRoomList);
    socket.on(S2C_EVENTS.ROOM_NICKNAME_RESULT, onNicknameResult);
    socket.on(S2C_EVENTS.ROOM_ERROR, onRoomError);
    socket.emit(C2S_EVENTS.ROOM_LIST_SUBSCRIBE);

    return () => {
      socket.off(S2C_EVENTS.ROOM_LIST, onRoomList);
      socket.off(S2C_EVENTS.ROOM_NICKNAME_RESULT, onNicknameResult);
      socket.off(S2C_EVENTS.ROOM_ERROR, onRoomError);
      socket.emit(C2S_EVENTS.ROOM_LIST_UNSUBSCRIBE);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // ルーム参加中でなければ切断
      const { roomCode: currentRoom } = useRoomStore.getState();
      if (!currentRoom) {
        socket.disconnect();
      }
    };
  }, []);

  // ニックネーム / ルームコード変更時のリアルタイム重複チェック
  useEffect(() => {
    // 入力変更時にエラーと重複フラグをリセット
    setIsNicknameTaken(false);
    setError(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const normalizedCode = roomCode.toUpperCase();
    const codeValid = RoomCodeSchema.safeParse(normalizedCode).success;
    const nickValid = NicknameSchema.safeParse(nickname).success;

    // 両方が有効な入力でなければチェックしない
    if (!codeValid || !nickValid) return;

    // 楽観的チェック: ルーム一覧データからローカルで即座に判定
    const targetRoom = rooms.find((r) => r.code === normalizedCode);
    if (targetRoom) {
      const lowerNickname = nickname.toLowerCase();
      const taken = targetRoom.participants.some(
        (p) => p.nickname.toLowerCase() === lowerNickname && p.isConnected,
      );
      if (taken) {
        setIsNicknameTaken(true);
        setError("このニックネームは既に使われています");
        return; // 楽観的に検出済みならサーバーチェック不要
      }
    }

    // サーバーチェック: デバウンス付きで room:check-nickname を送信
    debounceTimerRef.current = setTimeout(() => {
      if (socket.connected) {
        socket.emit(C2S_EVENTS.ROOM_CHECK_NICKNAME, {
          roomCode: normalizedCode,
          nickname,
        });
      }
    }, NICKNAME_CHECK_DEBOUNCE_MS);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [nickname, roomCode, rooms]);

  const handleSelectRoom = useCallback((code: string) => {
    setRoomCode(code);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const codeResult = RoomCodeSchema.safeParse(roomCode.toUpperCase());
    if (!codeResult.success) {
      setError("ルームコードは英数大文字6文字です");
      return;
    }

    const nickResult = NicknameSchema.safeParse(nickname);
    if (!nickResult.success) {
      setError(nickResult.error.errors[0]?.message ?? "入力が不正です");
      return;
    }

    if (isNicknameTaken) {
      setError("このニックネームは既に使われています");
      return;
    }

    setIsSubmitting(true);

    if (!socket.connected) {
      socket.connect();
    }

    // 購読解除してから参加処理へ
    socket.emit(C2S_EVENTS.ROOM_LIST_UNSUBSCRIBE);

    const normalizedCode = roomCode.toUpperCase();
    // NOTE: setCredentials は room:joined 成功時に setRoomState 内で設定されるため、
    // ここでは呼ばない。失敗時に不正な reconnect を誘発するバグを防止。
    socket.emit(C2S_EVENTS.ROOM_JOIN, { roomCode: normalizedCode, nickname });
  };

  /** 参加ボタン無効化条件: 送信中、またはニックネーム重複が検出されている */
  const isSubmitDisabled = isSubmitting || isNicknameTaken;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-900">ルームに参加</h1>
          <p className="mt-1 text-sm text-gray-500">
            ルームコードを入力するか、一覧からルームを選んでください
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-lg">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700">
              ルームコード
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="例: ABC123"
              maxLength={6}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-widest uppercase focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              disabled={isSubmitting || !!urlRoomCode}
            />
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">
              ニックネーム
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="2〜12文字"
              maxLength={12}
              className={`mt-1 block w-full rounded-lg border px-4 py-3 text-lg focus:outline-none focus:ring-2 ${
                isNicknameTaken
                  ? "border-red-400 focus:border-red-500 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-200"
              }`}
              disabled={isSubmitting}
            />
            {error && (
              <p className="mt-1 text-sm text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-lg font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "参加中..." : "参加する"}
          </button>
        </form>

        <RoomListPanel rooms={rooms} onSelectRoom={handleSelectRoom} />

        <div className="text-center">
          <Link to="/" className="text-sm text-indigo-600 hover:underline">
            ← トップに戻る
          </Link>
        </div>
      </div>
    </div>
  );
}
