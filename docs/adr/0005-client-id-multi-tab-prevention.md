# ADR-0005: clientId によるマルチタブ重複参加の防止

## Status

accepted

## Context

タブ間セッション管理（ADR-0004）では BroadcastChannel による「後発タブ優先」方式を実装したが、
この仕組みはリロード・タブ復元時の再接続パス（`RoomPage` の `performClaimAndJoin`）にのみ
適用されていた。

**新規参加パス**（`JoinRoomPage` → `room:join` → `useSocket.onRoomJoined` → `RoomPage`）では
BroadcastChannel のチェックが一切行われず、同一ブラウザの別タブから異なるニックネームで
同じルームに重複参加できてしまうバグが存在した。

### 問題の詳細

1. `JoinRoomPage` に `TabSession` の呼び出しが完全に欠落
2. `RoomPage` が JoinRoomPage から遷移してきた場合、`storeRoomCode === roomCode` が既に
   `true` のため `isReconnecting = false` → `claim()` がスキップされる
3. サーバ側にはマルチタブ検出ロジックがなく、異なるニックネームの参加は常に成功

## Decision

3層防御で対策する:

### 1. クライアント側: JoinRoomPage に BroadcastChannel チェック追加

`handleSubmit` 内で `TabSession.hasActiveTab()` を呼び出し、
アクティブなタブが存在する場合は参加をブロックしてエラーメッセージを表示する。

### 2. クライアント側: RoomPage の claim() 実行を無条件化

`RoomPage` マウント時に `isReconnecting` に関係なく `tabSession.claim()` を実行する。
JoinRoomPage から遷移してきた場合でも、旧タブの `onYielded` が発火して
自動的にソケット切断される。

### 3. サーバ側: clientId による重複検出（最終防衛線）

- `clientId`: ブラウザ単位の UUID を `localStorage` に永続化
- `room:join` / `room:create` のペイロードに `clientId` を含める
- `RoomAggregate.addParticipant()` で同一 `clientId` の接続中参加者がいる場合
  `DUPLICATE_CLIENT` エラーをスローして参加を拒否
- `clientId` は `Participant` オブジェクトに保存し、`reconnectParticipant` 時に更新

### BroadcastChannel のスコープ

BroadcastChannel は現状のグローバルスコープ（全ルーム共通）を維持する。
1ブラウザにつき1タブの制約は変更しない。

### clientId の設計判断

- `clientId` は `z.string().uuid().optional()` としてバリデーション
- optional にすることで旧クライアントとの後方互換を維持
- `clientId` 未提供時は重複チェックをスキップ（縮退モード）
- `clientId` は `ParticipantInfo`（クライアント向けDTO）には含めない

## Consequences

### Positive

- 同一ブラウザの別タブからの同一ルームへの重複参加を確実に防止
- クライアント側チェック（UX）とサーバ側チェック（セキュリティ）の両方で防御
- 既存のテスト・APIとの後方互換を維持（`clientId` はオプショナル）

### Negative

- `localStorage` が無効な環境では `clientId` が毎回変わるため、サーバ側チェックが機能しない
  → クライアント側の BroadcastChannel チェックで防御（BroadcastChannel も無効なら縮退モード）
- `clientId` は同一オリジン内でのみ有効。異なるブラウザやシークレットモード間では検出不可
  → これは意図的な設計。異なるブラウザからは別ユーザーとして扱う
