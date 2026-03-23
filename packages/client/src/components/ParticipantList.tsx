/**
 * ParticipantList — 参加者一覧コンポーネント
 *
 * ロビーやクイズ中サイドバーで参加者の状態を表示する。
 * mode に応じて右カラムの表示を切り替える:
 *   - lobby: プロフィール入力状態（✓ / 未入力）
 *   - quiz:  回答状態（✓ 回答済み / ⏳ 回答中）
 * currentNickname と一致する行は強調表示する。
 * テーマ対応の参加者入室アニメーション付き。
 */

import { motion, AnimatePresence } from "framer-motion";
import { useRoomStore } from "../stores/useRoomStore.js";
import { useAnimationTheme } from "../animations/useAnimationTheme.js";

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
  const theme = useAnimationTheme();

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

              {/* 右カラム: モードに応じた状態表示 */}
              <div className="shrink-0 ml-2">
                {mode === "lobby" ? (
                  // ロビー: プロフィール入力状態
                  p.hasProfile ? (
                    <span className={theme.colors.statusOk}>✓</span>
                  ) : (
                    <span className={`${theme.colors.textSecondary} text-xs`}>未入力</span>
                  )
                ) : (
                  // クイズ中: 回答状態
                  hasAnswered ? (
                    <span className={theme.colors.statusOk} title="回答済み">✓</span>
                  ) : (
                    <span className={theme.colors.textSecondary} title="回答中">⏳</span>
                  )
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
