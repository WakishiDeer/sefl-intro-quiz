/**
 * ParticipantList — 参加者一覧コンポーネント
 *
 * ロビーやクイズ中サイドバーで参加者の状態を表示する。
 * mode に応じて右カラムの表示を切り替える:
 *   - lobby: プロフィール入力状態（✓ / 未入力）
 *   - quiz:  回答状態（✓ 回答済み / ⏳ 回答中）
 * currentNickname と一致する行は強調表示する。
 * ホストは非接続の参加者をキックできる。
 * テーマ対応の参加者入室アニメーション付き。
 */

import { motion, AnimatePresence } from "framer-motion";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";
import { socket } from "../lib/socket.js";
import { C2S_EVENTS } from "@self-intro-quiz/shared";

interface ParticipantListProps {
  /** 表示モード: lobby=プロフィール状態 / quiz=回答状態 */
  mode: "lobby" | "quiz";
  /** 自分のニックネーム（強調表示用） */
  currentNickname?: string | null;
  /** 回答済み参加者のニックネーム一覧（quiz モードで使用） */
  answeredNicknames?: string[];
}

export function ParticipantList({
  mode,
  currentNickname,
  answeredNicknames = [],
}: ParticipantListProps) {
  const participants = useRoomStore((s) => s.participants);
  const isHost = useRoomStore((s) => s.isHost);
  const theme = useAnimationTheme();

  const handleKick = (participantId: string) => {
    socket.emit(C2S_EVENTS.ROOM_KICK, { targetParticipantId: participantId });
  };

  return (
    <div className="space-y-2">
      <h3 className={`text-sm font-semibold ${theme.colors.textSecondary} uppercase tracking-wide`}>
        参加者 ({participants.length})
      </h3>
      <AnimatePresence>
        <ul className="space-y-1">
          {participants.map((p) => {
            const isMe = currentNickname != null && p.nickname === currentNickname;
            const hasAnswered = answeredNicknames.includes(p.nickname);
            // ホストは自分以外の参加者をキックできる
            const canKick = isHost && !isMe && !p.isHost;

            return (
              <motion.li
                key={p.nickname}
                variants={theme.variants.participantJoin}
                initial="initial"
                animate="animate"
                layout
                className={[
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                theme.colors.textPrimary,
                p.isConnected ? "" : "opacity-60",
                isMe
                  ? `${theme.colors.cardBg} ring-2 ring-offset-0 ${theme.colors.cardBorder}`
                  : p.isConnected
                    ? theme.colors.surfaceMuted
                    : `${theme.colors.surfaceMuted} opacity-60`,
              ].join(" ")}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                    p.isConnected ? theme.colors.participantOnline : theme.colors.participantOffline
                  }`}
                />
                <span className="font-medium truncate">
                  {p.nickname}
                  {isMe && (
                    <span className={`ml-1 text-xs ${theme.colors.textAccent}`}>(あなた)</span>
                  )}
                </span>
                {p.isHost && (
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${theme.colors.badgeWarning}`}>
                    Host
                  </span>
                )}
              </div>

              {/* 右カラム: 状態表示 + キックボタン */}
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {mode === "lobby" ? (
                  p.hasProfile ? (
                    <span className={theme.colors.statusOk}>✓</span>
                  ) : (
                    <span className={`${theme.colors.textSecondary} text-xs`}>未入力</span>
                  )
                ) : (
                  hasAnswered ? (
                    <span className={theme.colors.statusOk} title="回答済み">✓</span>
                  ) : (
                    <span className={theme.colors.textSecondary} title="回答中">⏳</span>
                  )
                )}
                {canKick && (
                  <button
                    onClick={() => handleKick(p.participantId)}
                    className={`ml-1 rounded px-1.5 py-0.5 text-xs ${theme.colors.buttonDanger} opacity-70 hover:opacity-100 transition-opacity`}
                    title={`${p.nickname} を除外`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </motion.li>
          );
        })}
        </ul>
      </AnimatePresence>
    </div>
  );
}
