/**
 * TopPage — トップページ
 *
 * ルーム作成 or 参加を選択する画面。
 * トップに戻った = ルームから退出した、とみなしセッション情報をクリアする。
 * ただし他タブがルーム内にいる場合は、そのタブの復帰用セッションを壊さないよう保持する。
 */

import { useEffect } from "react";
import { Link } from "react-router";
import { clearSession } from "../lib/sessionPersistence";
import { TabSession } from "../lib/tabSession";

export function TopPage() {
  // トップページ表示時にセッション情報をクリア（意図的な退出）
  // ただし他タブがアクティブなら clearSession しない
  useEffect(() => {
    const tabSession = new TabSession();

    tabSession.hasActiveTab().then((active) => {
      if (!active) {
        clearSession();
      }
      tabSession.destroy();
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div>
          <h1 className="text-4xl font-bold text-indigo-900">
            🎉 Self-Intro Quiz
          </h1>
          <p className="mt-2 text-gray-600">
            みんなの自己紹介でクイズ大会！
          </p>
        </div>

        <div className="space-y-4">
          <Link
            to="/create"
            className="block w-full rounded-xl bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-indigo-700 hover:shadow-xl"
          >
            ルームを作成する
          </Link>

          <Link
            to="/join"
            className="block w-full rounded-xl border-2 border-indigo-300 bg-white px-6 py-4 text-lg font-semibold text-indigo-700 shadow transition hover:border-indigo-400 hover:bg-indigo-50"
          >
            ルームに参加する
          </Link>
        </div>

        <div className="pt-2">
          <a
            href="/howto"
            className="text-sm text-indigo-400 underline hover:text-indigo-600 transition"
          >
            📖 HOW TO USE (v0.1.0)
          </a>
        </div>
      </div>
    </div>
  );
}
