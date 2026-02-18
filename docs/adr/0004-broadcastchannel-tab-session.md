# 0004: BroadcastChannel によるタブ間セッション管理（後発タブ優先）

## Status

accepted

## Context

セッション永続化（localStorage に roomCode / nickname を保存）を導入した結果、
複数タブで同じルーム URL を開いた場合に以下の問題が発生した。

1. **NICKNAME_TAKEN エラー**: Tab A が接続中に Tab B が同じニックネームで `room:join` を送ると、
   サーバの `reconnectParticipant` は `isConnected === true` の参加者を再接続対象にしないため、
   新規参加扱いとなり `NICKNAME_TAKEN` でリジェクトされる

2. **clearSession のクロスタブ干渉**: TopPage に遷移したタブが `localStorage.removeItem` を実行すると、
   他タブのリロード復帰用セッション情報まで破壊される

3. **セッション奪取のリスク**: ネットワーク不安定時に旧タブが一時切断中（`isConnected === false`）に
   新タブが `reconnectParticipant` に成功し、旧タブが復帰時に `NICKNAME_TAKEN` になる

### 検討した選択肢

| 選択肢 | 概要 | 長所 | 短所 |
|---|---|---|---|
| A: 最小限の防御策 | NICKNAME_TAKEN のエラー表示改善のみ | 実装が簡単 | 全タブ閉じ→再開は動作するが、別タブからの操作がクリアでない |
| B: 1タブ限定 | sessionStorage の tabId で自動復帰をブロック | 他タブが干渉しない | タブを閉じて新タブで開く場合に自動復帰不可（sessionStorage が消失） |
| **C: 後発タブ優先** | BroadcastChannel で旧タブを切断し新タブに移行 | 全シナリオで自然に動作 | 実装複雑度が最も高い。BroadcastChannel 未サポート環境は縮退 |

### 制約

- サーバ側は変更不要であること（既存の `reconnectParticipant` + `disconnectParticipant` で対応可能）
- MVP の規模に対してオーバーエンジニアリングにならないこと
- BroadcastChannel 未サポート環境でもクラッシュしないこと

## Decision

**選択肢 C「後発タブ優先（BroadcastChannel）」** を採用する。

### 設計

#### メッセージプロトコル

| メッセージ | 方向 | 用途 |
|---|---|---|
| `SESSION_CLAIM` | 新タブ → 全タブ | セッション所有権の要求 |
| `SESSION_YIELD` | 旧タブ → 新タブ | socket 切断完了の通知 |
| `SESSION_PROBE` | 任意 → 全タブ | アクティブタブの存在確認 |
| `SESSION_ACTIVE` | 任意 → 応答 | PROBE への応答 |

チャネル名: `self-intro-quiz:session`

#### フロー

1. 新タブが RoomPage をマウント → `TabSession.claim()` で `SESSION_CLAIM` を送信
2. 旧タブが受信 → `socket.disconnect()` → 「別のタブで開かれています」UI を表示 → `SESSION_YIELD` を返信
3. 新タブが `SESSION_YIELD` 受信（or 500ms タイムアウト）→ 150ms 待機 → `socket.connect()` → `room:join`
4. サーバ側: 旧タブの disconnect で `isConnected = false` → 新タブの `room:join` で `reconnectParticipant` 成功

#### レースコンディション対策

- `SESSION_YIELD` 受信後 150ms の待機で、旧ソケットの disconnect がサーバに到達する猶予を確保
- それでも `NICKNAME_TAKEN` になった場合のリトライ（最大 2 回、300ms 間隔）

#### フォールバック

`typeof BroadcastChannel === "undefined"` の場合、`claim()` は即 resolve し、現行と同じ動作に縮退する。

### 変更対象

- **新規**: `packages/client/src/lib/tabSession.ts` — BroadcastChannel ラッパー
- **新規**: `packages/client/src/lib/tabSession.test.ts` — ユニットテスト（13 テスト）
- **変更**: `packages/client/src/hooks/useSocket.ts` — `onConnect` から localStorage フォールバック削除
- **変更**: `packages/client/src/pages/RoomPage.tsx` — claim フロー + isYielded UI + NICKNAME_TAKEN リトライ
- **変更**: `packages/client/src/pages/TopPage.tsx` — `clearSession` を条件付きに（`hasActiveTab` チェック）
- **変更なし**: サーバ側全ファイル、shared パッケージ

## Consequences

### Positive

- 「今操作しているタブ」が常にアクティブになる、直感的な UX
- 旧タブには明確なメッセージと「再開」ボタンを提供するため、ユーザーが混乱しない
- リロード・タブ閉じ→再開・新タブ、すべてのシナリオで自動復帰が正しく動作する
- 他タブの TopPage 遷移がアクティブタブのセッションを破壊しない
- サーバ側の変更が不要（既存の reconnect / disconnect ロジックをそのまま活用）

### Negative

- BroadcastChannel 未サポートブラウザ（IE, 古い Safari）では縮退動作になる
- claim + 待機 + connect + join のステップが増え、リロード復帰に若干の遅延が生じる（約 300-700ms 増加）
- テストは BroadcastChannel の Mock に依存するため、E2E レベルの検証は手動テストが必要

### Risks

- 3 タブ以上を高速で開閉した場合のレースコンディション — SESSION_CLAIM は最後のタブが勝つ設計だが、
  極端なケースでは一時的に2タブが同時に connect を試みる可能性がある。
  NICKNAME_TAKEN リトライでカバーする
- BroadcastChannel のメッセージ配信遅延がブラウザ実装に依存する — 
  500ms のタイムアウトで実用上は問題ないが、極端に低速な環境では不足する可能性がある
