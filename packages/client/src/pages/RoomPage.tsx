/**
 * RoomPage — ルームメインページ
 *
 * phase に応じてロビー / クイズ進行 / 結果画面を切り替える。
 * URL 遷移なしでリアルタイム状態遷移を表現する。
 *
 * リロード・新タブ時は BroadcastChannel（TabSession）で旧タブの socket を
 * 切断させてからセッションを引き継ぐ「後発タブ優先」方式。
 * 旧タブには「別のタブで開かれました」と表示し、再開ボタンを提供する。
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Navigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useRoomStore } from "../stores/useRoomStore";
import { useQuizStore } from "../stores/useQuizStore";
import { useAnimationTheme } from "../animations/useAnimationTheme";
import { socket } from "../lib/socket";
import { loadSession, clearSession, getOrCreateClientId } from "../lib/sessionPersistence";
import { TabSession, POST_YIELD_DELAY_MS } from "../lib/tabSession";
import { C2S_EVENTS, S2C_EVENTS } from "@self-intro-quiz/shared";
import type { RoomErrorPayload } from "@self-intro-quiz/shared";
import { LobbyView } from "../components/LobbyView";
import { QuizView } from "../components/QuizView";
import { ResultView } from "../components/ResultView";
import { InvitationBanner } from "../components/InvitationBanner";
import { ReactionBar } from "../components/ReactionBar";
import { ReactionParticles } from "../animations/effects/ReactionParticles";

/** セッション復帰の最大待ち時間（ms）。claim + 接続 + room:join の合計 */
const RECONNECT_TIMEOUT_MS = 8000;

/** NICKNAME_TAKEN 時の最大リトライ回数 */
const MAX_JOIN_RETRIES = 2;

/** NICKNAME_TAKEN リトライ間隔（ms） */
const RETRY_DELAY_MS = 300;

/**
 * sleep ユーティリティ
 */
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function RoomPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const phase = useRoomStore((s) => s.phase);
    const storeRoomCode = useRoomStore((s) => s.roomCode);
    const isConnected = useRoomStore((s) => s.isConnected);
    const theme = useAnimationTheme();

    // リロード復帰中フラグ
    const [isReconnecting, setIsReconnecting] = useState(() => {
        if (storeRoomCode && storeRoomCode === roomCode) return false;
        const session = loadSession();
        return !!(session && session.roomCode === roomCode);
    });

    // 他タブにセッションを譲渡した状態
    const [isYielded, setIsYielded] = useState(false);

    // TabSession インスタンスを ref で保持（コンポーネントのライフサイクルに紐づく）
    const tabSessionRef = useRef<TabSession | null>(null);

    // マウント時に TabSession を作成、アンマウント時に破棄
    useEffect(() => {
        tabSessionRef.current = new TabSession();

        return () => {
            tabSessionRef.current?.destroy();
            tabSessionRef.current = null;
        };
    }, []);

    /**
     * claim + 接続 + room:join を実行するコアフロー。
     * isReconnecting 状態と「このタブで再開する」ボタンの両方から呼ばれる。
     */
    const performClaimAndJoin = useCallback(async () => {
        const session = loadSession();
        if (!session || session.roomCode !== roomCode) {
            // セッション情報なし → join ページへ
            setIsReconnecting(false);
            return;
        }

        const tabSession = tabSessionRef.current;

        // 1. BroadcastChannel で旧タブの切断を要求
        if (tabSession) {
            await tabSession.claim();
        }

        // 2. 旧タブの disconnect がサーバに到達するのを待つ
        await sleep(POST_YIELD_DELAY_MS);

        // 3. Socket 接続
        if (!socket.connected) {
            socket.connect();
            // connect イベントを待つ
            await new Promise<void>((resolve) => {
                const onConnect = () => {
                    socket.off("connect", onConnect);
                    resolve();
                };
                if (socket.connected) {
                    resolve();
                } else {
                    socket.on("connect", onConnect);
                }
            });
        }

        // 4. room:join を送信（NICKNAME_TAKEN リトライ付き）
        let joined = false;
        for (let attempt = 0; attempt <= MAX_JOIN_RETRIES; attempt++) {
            joined = await new Promise<boolean>((resolve) => {
                const onJoined = () => {
                    cleanup();
                    resolve(true);
                };
                const onError = (payload: RoomErrorPayload) => {
                    if (payload.code === "NICKNAME_TAKEN") {
                        cleanup();
                        resolve(false);
                    }
                    // 他のエラーは useSocket の onError が処理するので、ここでは無視
                };
                const cleanup = () => {
                    socket.off(S2C_EVENTS.ROOM_JOINED, onJoined);
                    socket.off(S2C_EVENTS.ROOM_ERROR, onError);
                };

                socket.on(S2C_EVENTS.ROOM_JOINED, onJoined);
                socket.on(S2C_EVENTS.ROOM_ERROR, onError);
                socket.emit(C2S_EVENTS.ROOM_JOIN, {
                    roomCode: session.roomCode,
                    nickname: session.nickname,
                    clientId: getOrCreateClientId(),
                });

                // 個別タイムアウト: 3 秒以内に応答がなければ失敗扱い
                setTimeout(() => {
                    cleanup();
                    resolve(false);
                }, 3000);
            });

            if (joined) break;
            if (attempt < MAX_JOIN_RETRIES) {
                await sleep(RETRY_DELAY_MS);
            }
        }

        if (!joined) {
            // リトライ上限を超えた — セッションを破棄
            clearSession();
        }

        setIsReconnecting(false);
    }, [roomCode]);

    // リロード復帰フロー: isReconnecting が true の場合に claim + join を実行
    useEffect(() => {
        if (!isReconnecting) return;

        let cancelled = false;

        const run = async () => {
            // TabSession の初期化を待つ（useEffect の実行順序により ref がまだ null の場合がある）
            await sleep(0);
            if (cancelled) return;
            await performClaimAndJoin();
        };
        run();

        // 全体タイムアウト
        const timer = setTimeout(() => {
            cancelled = true;
            setIsReconnecting(false);
            clearSession();
        }, RECONNECT_TIMEOUT_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [isReconnecting, performClaimAndJoin]);

    // 他タブからの SESSION_CLAIM を受けた時のハンドラ
    useEffect(() => {
        const tabSession = tabSessionRef.current;
        if (!tabSession) return;

        tabSession.onYielded(() => {
            // socket を切断して旧タブ化
            socket.disconnect();
            setIsYielded(true);
        });
    }, []);

    // JoinRoomPage から遷移した場合（isReconnecting=false）にも、他タブのセッションを奪取する。
    // これにより、万が一 JoinRoomPage の hasActiveTab() チェックをすり抜けた場合でも
    // 旧タブ側の onYielded が発火し「別のタブで開かれています」表示になる。
    useEffect(() => {
        const tabSession = tabSessionRef.current;
        // reconnect フローは performClaimAndJoin 内で claim() を呼ぶため、ここではスキップ
        if (!tabSession || isReconnecting) return;
        // ストアにルーム情報がある（= JoinRoomPage から遷移してきた）場合のみ
        if (storeRoomCode && storeRoomCode === roomCode) {
            tabSession.claim(); // fire-and-forget: 旧タブがあれば yield させる
        }
    }, [isReconnecting, storeRoomCode, roomCode]);

    // ストアに roomCode がセットされたら復帰完了
    useEffect(() => {
        if (isReconnecting && storeRoomCode === roomCode) {
            setIsReconnecting(false);
        }
    }, [isReconnecting, storeRoomCode, roomCode]);

    // ----- 「このタブで再開する」ボタンのハンドラ -----
    const handleReclaim = useCallback(() => {
        setIsYielded(false);
        setIsReconnecting(true);
        // useEffect が isReconnecting の変化を検知して performClaimAndJoin を再実行
    }, []);

    // ===== レンダリング =====

    // 他タブにセッション譲渡済み
    if (isYielded) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
                <div className="text-center space-y-6 max-w-sm">
                    <div className="text-5xl">📱</div>
                    <h2 className="text-xl font-bold text-indigo-900">
                        別のタブで開かれています
                    </h2>
                    <p className="text-sm text-gray-600">
                        このルームは別のタブで操作中です。
                        このタブで続けたい場合は、下のボタンを押してください。
                    </p>
                    <button
                        onClick={handleReclaim}
                        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow transition hover:bg-indigo-700"
                    >
                        このタブで再開する
                    </button>
                </div>
            </div>
        );
    }

    // 再接続中はローディング表示
    if (isReconnecting) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100">
                <div className="text-center space-y-4">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-indigo-300 border-t-indigo-600" />
                    <p className="text-lg font-medium text-indigo-900">再接続中...</p>
                    <p className="text-sm text-gray-500">ルームに復帰しています</p>
                </div>
            </div>
        );
    }

    // ルームに参加していない場合はジョインページに戻す
    if (!storeRoomCode || storeRoomCode !== roomCode) {
        return <Navigate to={`/join/${roomCode}`} replace />;
    }

    return (
        <div className={`min-h-screen bg-linear-to-br ${theme.colors.bgGradient} transition-colors duration-500`}>
            {/* 接続断バナー */}
            {!isConnected && (
                <div className={`px-4 py-2 text-center text-sm font-medium ${theme.colors.badgeWarning}`}>
                    接続が切れました。再接続中...
                </div>
            )}

            {/* フェーズに応じた表示切替（AnimatePresence でトランジション） */}
            <AnimatePresence mode="wait">
                {(phase === "lobby" || phase === "generating") && (
                    <motion.div
                        key="lobby"
                        variants={theme.variants.phaseTransition}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <LobbyView />
                    </motion.div>
                )}
                {(phase === "playing" || phase === "revealing" || phase === "interviewing") && (
                    <motion.div
                        key="quiz"
                        variants={theme.variants.phaseTransition}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <QuizView />
                    </motion.div>
                )}
                {phase === "finished" && (
                    <motion.div
                        key="result"
                        variants={theme.variants.phaseTransition}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        <ResultView />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 他のルームからの招待通知 */}
            <InvitationBanner />

            {/* リアクションパーティクル（全画面オーバーレイ） */}
            <ReactionParticles />

            {/* リアクション送信バー（画面下部固定） */}
            <ReactionBar />
        </div>
    );
}
