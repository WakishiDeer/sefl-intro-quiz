# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/ja/).

## [Unreleased]

### Added

- **ホスト即時委譲**: ホストが退出・切断した際に即座にホスト権限を最古参の接続中参加者に委譲する機能を追加。30秒の猶予期間を廃止し、ロビー・クイズ進行中・結果画面など全フェーズで即時委譲が動作。`RoomAggregate.disconnectAndTransferHost()` / `hasConnectedParticipants()` メソッド追加
- **空ルーム自動削除**: 全参加者が切断した場合、ルームを即座に自動削除する機能を追加。ルームとクイズデータを即時クリーンアップし、ルーム一覧からも削除
- **トースト通知**: ホスト委譲時に全参加者へ通知を表示する `Toast` コンポーネントと `useToastStore` を新規作成。新しいホストには「あなたが新しいホストになりました」、他の参加者には「○○さんが新しいホストになりました」と表示

### Removed

- `HOST_RECONNECT_GRACE_MS` 定数を削除（即時ホスト委譲への変更に伴い不要に）

### Changed

- **ロビー復帰機能**: クイズ終了後にルームを閉じずにロビーへ戻れる機能を追加。Host が結果画面で「ロビーに戻る」ボタンを押すと、全参加者がロビーフェーズに戻り、プロフィールを保持したまま次のクイズを生成可能に。`RoomAggregate.backToLobby()` メソッド追加、`room:back-to-lobby` イベント（C2S / S2C）追加、`ResultView` に「ロビーに戻る」ボタン追加
- **セッション維持（リロード復帰）**: ブラウザリロードやタブ再開時にルームへ自動復帰する機能を追加。`localStorage` に `roomCode` / `nickname` を保存し、リロード後に自動で `socket.connect()` → `room:join` を再送信。既存のニックネームベース再接続（`reconnectParticipant`）で全状態（フェーズ・スコア・現在の問題）が復元される。`RoomPage` に再接続中ローディング表示（5秒タイムアウト付き）を追加
- **タブ間セッション管理（後発タブ優先）**: BroadcastChannel を使い、新しいタブが同じルームを開いたら旧タブの Socket を自動切断し、セッションを引き継ぐ仕組みを追加（ADR-0004）。旧タブには「別のタブで開かれています」画面と「このタブで再開する」ボタンを表示。`TopPage` の `clearSession` を条件付きに変更し、他タブのセッションを破壊しないよう改善。BroadcastChannel 未サポート環境では従来動作にフォールバック
- プロジェクト初期セットアップ（モノレポ構成）
- PRD（プロダクト仕様書）作成 (`docs/prd.md`)
- 技術設計書作成 (`docs/technical-design.md`)
- Socket.IO イベント仕様書作成 (`docs/api-events.md`)
- Tech Spec（技術仕様書）作成 (`docs/tech-spec.md`)
- DDD アーキテクチャ設計（Room Context / Quiz Context の Bounded Context 分割）
- Ports & Adapters パターン導入（RoomRepository, QuizGenerator, QuizRepository）
- GitHub Copilot 用インストラクション作成 (`.github/copilot-instructions.md`)
- CHANGELOG.md 作成
- ADR テンプレートおよび ADR-0001（DDD + Ports & Adapters）、ADR-0002（Claude API 採用）作成
- `.env.example`、`.gitignore`、`README.md` 作成
- **Phase 0**: npm workspaces によるモノレポ構成（shared / server / client）
- **Phase 1**: 共有型定義・定数・Zod バリデーションスキーマ（`@self-intro-quiz/shared`）
- **Phase 2**: ドメイン層 — `RoomAggregate` / `QuizAggregate` / Port インターフェース
- **Phase 3**: インフラ層 — `InMemoryRoomRepository` / `InMemoryQuizRepository` / `ClaudeQuizGenerator` / `NodeTimerService` / ユーティリティ
- **Phase 4**: アプリケーション層 — Socket.IO イベントハンドラ（`roomHandlers` / `quizHandlers`）/ Express サーバエントリポイント
- **Phase 5**: クライアント基盤 — Socket.IO クライアント / Zustand ストア（`useRoomStore` / `useQuizStore`）/ カスタムフック（`useSocket` / `useTimer`）
- **Phase 6**: クライアント UI — ページ（Top / CreateRoom / JoinRoom / Room）/ コンポーネント（ProfileForm / ParticipantList / LobbyView / QuizView / ResultView 等 11 コンポーネント）
- **Phase 7**: ユニットテスト — RoomAggregate (27 tests) / QuizAggregate (21 tests) / InMemoryRoomRepository (7 tests) / InMemoryQuizRepository (3 tests) / roomCode (3 tests) / sanitize (6 tests) / Zod validation (22 tests) — 計 89 テスト全パス
- **Phase 8**: Join ページにリアルタイムルーム一覧表示機能を追加 — Socket.IO subscribe パターンで既存ルーム・参加者をリアルタイム確認可能に（ニックネーム重複の事前把握）。`RoomListPanel` コンポーネント新規作成、`broadcastRoomList` ヘルパー追加、テスト 4 件追加（計 93 テスト全パス）
- **Phase 9**: ニックネーム重複リアルタイム拒否機能 — 事前チェック（楽観的UI + `room:check-nickname` イベント）と参加時の最終バリデーションの二段構え。case-insensitive なニックネーム比較、インラインエラー表示、`isSubmitting` 未リセットバグ修正、`setCredentials` タイミング修正

### Fixed

- セッション再接続後、クイズ進行中（playing / revealing）に「問題を読み込み中...」のまま固まる問題を修正。`room:joined` 受信時に `RoomStateSync` の `currentQuestion` / `revealedAnswer` を quiz ストアに復元する `restoreQuizState` ヘルパーを追加。`generating` / `finished` フェーズでの復帰も同時に対応
- 存在しないルームコードでニックネーム重複チェックを行うと、常に「このニックネームは既に使われています」と表示されていたバグを修正。`NicknameResultPayload` に `reason` フィールドを追加し、ルーム不在時は「ルームが見つかりません」を表示するよう改善
- `AIOutputJsonSchema` の `zodToJsonSchema` 呼び出しで `name` オプションを指定していたため、生成されるスキーマが `definitions` ラッパーで包まれ、トップレベルに `type: "object"` が存在しなかった。Anthropic API は `input_schema.type` を必須フィールドとするため `400 invalid_request_error` が発生していた。`name` オプション除去とフラットスキーマ生成に修正し、`$schema` メタキーも除去
- 全フィールド空のプロフィールでクイズ生成が可能になっていた問題を修正。`ProfileSchema` に `.refine()` で最低1フィールド非空バリデーション追加、`RoomAggregate.getProfileSubmittedCount()` で空プロフィール除外、`ClaudeQuizGenerator.buildUserPrompt()` で空フィールド省略、`ProfileForm` にサーバ側エラーのフィードバック表示を追加

### Changed

- Claude API 呼び出しを tool_use（Function Calling）に変更し、JSON 出力をスキーマレベルで強制（ADR-0003）
  - `extractText` / `extractJson` によるテキストパースを廃止し、`tool_use` ブロックの `.input` を直接取得
  - JSON Schema は `shared` の `AIOutputSchema`（Zod）から `zod-to-json-schema` で自動生成（Single Source of Truth）
  - `ClaudeQuizGenerator` のユニットテスト新規追加
- AI プロバイダーを OpenAI GPT-4o-mini から Anthropic Claude Sonnet 4.5 に変更（ADR-0002）
- `OpenAIQuizGenerator` → `ClaudeQuizGenerator` にリネーム
- 環境変数 `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` に変更
- サーバ依存パッケージ `openai` → `@anthropic-ai/sdk` に変更
