# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/ja/).

## [Unreleased]

### Added

- **カスタムプロフィール項目**: ホストがロビーフェーズでプロフィール入力項目を自由にカスタマイズ可能に（1〜10個）。項目の追加・削除・並び替え・ラベル編集に対応。フィールド構成が変わると全参加者のプロフィールが自動リセットされ再入力を促す
  - `ProfileFieldDefinition` 型（id / label / placeholder）を `@self-intro-quiz/shared` に追加
  - `Profile` 型を固定フィールドから `Record<string, string>` に変更（動的フィールド対応）
  - `DEFAULT_PROFILE_FIELDS` デフォルト6項目（出身地・趣味・特技・好きな食べ物・意外な事実・自由記述）
  - `createProfileSchema()` 動的バリデーションスキーマファクトリを追加
  - `UpdateFieldsSchema` / `ProfileFieldDefinitionSchema` バリデーション追加
  - `RoomAggregate.updateProfileFields()` メソッド追加（ホスト権限・フェーズ・項目数・ID重複チェック）
  - `fields:update` (C2S) / `fields:updated` (S2C) Socket.IO イベント追加
  - `ProfileFieldEditor` コンポーネント新規作成（ホスト専用モーダル）
  - `ProfileForm` を動的フィールド対応に改修（`useRoomStore.profileFields` ベース）
- **みんなで AI リクエスト**: ホスト発動で全参加者がプリセット選択 + 自由テキストでリクエストを送信し、AI がプロフィール項目を提案する機能
  - `ProfileFieldSuggester` Port インターフェース（domain 層）
  - `ClaudeProfileFieldSuggester` 実装（Claude tool_use / リトライ付き）
  - `aiRequestHandlers` アプリケーション層ハンドラ（セッション管理・リクエスト収集・AI生成・採用）
  - `ai-request:start` / `ai-request:submit` / `ai-request:finalize` / `ai-request:adopt` (C2S) イベント追加
  - `ai-request:started` / `ai-request:status` / `ai-request:result` (S2C) イベント追加
  - `AI_REQUEST_PRESETS` プリセット8種・`AI_REQUEST_MAX_FREE_TEXT` (200文字) ・`AI_REQUEST_TIMEOUT_MS` (60秒) 定数追加
  - `AIRequestModal` コンポーネント新規作成（全参加者向けリクエスト送信UI）
  - `AIRequestResultPanel` コンポーネント新規作成（ホスト向け提案確認・採用UI）
  - `useRoomStore` に AI リクエスト状態管理を追加
  - `useSocket` に `fields:updated` / `ai-request:*` イベントリスナー追加
- `LobbyView` にホスト向け「📝 プロフィール項目を編集」「🤖 みんなで AI リクエスト」ボタンを追加

### Fixed

- **AI リクエストのキャンセル機能**: ホストが AI リクエスト収集中にキャンセルできるよう「❌ AI リクエストをキャンセル」ボタンを追加。キャンセル時は全参加者のセッションを終了しトースト通知を表示
- **AI リクエストモーダルの閉じるボタン**: 全参加者（ホスト・クライアント）がモーダルを閉じられるよう改善。閉じてもセッションは継続し、状態が遷移（収集中→生成中→結果）するとモーダルが自動再表示される
- **AI リクエスト生成中の視覚的フィードバック**: finalize 後にサーバから `ai-request:generating` イベントを送信し、全員のモーダルが「AI が考え中...」表示に切り替わるよう改善
- **ホスト切断時の AI リクエスト自動キャンセル**: ホストがリロード等で切断した場合、進行中の AI リクエストセッションを全参加者に対して自動キャンセルするよう改善
- **クイズ生成ボタンの状態表示**: 生成中はスピナー + 「クイズを生成中...」テキストに変化し disabled になるよう改善。プロフィール提出済み人数と最低必要人数（3人）を表示し、条件未充足時はボタンを disabled にする

### Changed

- `Profile` 型を `Record<string, string>` に変更（固定6フィールド → 動的フィールド）
- `sanitizeProfile()` を動的キー対応に改修
- `ClaudeQuizGenerator.generate()` に `profileFields` パラメータを追加しフィールドラベル解決を動的化
- `QuizGenerator` Port の `generate()` シグネチャに `profileFields` パラメータを追加
- デフォルトプロフィール項目のフィールド ID を camelCase から snake_case に変更（`favoriteFood` → `favorite_food` 等）
- テスト計 198 件全パス（shared 55 + server 143）

### Added (previous)

- **ルーム退出ボタン**: ロビー画面に「ルームから退出する」ボタンを追加。全参加者（ホスト含む）が明示的にルームを離脱可能に。退出時はセッションをクリアしトップページへ遷移する
- **切断タイムアウトによる参加者自動削除**: タブを閉じた（切断した）参加者を5分後にルームから完全削除する機能を追加。切断直後はグレー表示（再接続猶予あり）、タイムアウト後は参加者一覧から除去される
  - `DISCONNECT_REMOVE_TIMEOUT_MS` 定数を `@self-intro-quiz/shared` に追加（デフォルト5分）
  - `RoomAggregate.leaveAndTransferHost()` メソッド追加（参加者の完全削除 + ホスト移譲）
  - `ParticipantLeftPayload` に `removed` フィールドを追加（`true`: 完全削除、`false`/`undefined`: 一時切断）
  - サーバ側で `room:leave`（明示的退出）と `disconnect`（タブ閉じ）を分離処理
  - 再接続時に切断タイムアウトのタイマーを自動キャンセル
- **同一ブラウザ再参加時の旧参加者自動削除**: タブを閉じた後に同じブラウザから別ニックネームで再参加した場合、グレー表示の旧参加者を即座に自動削除する機能を追加。`RoomAggregate.removeDisconnectedByClientId()` メソッド追加。`room:join` ハンドラで `addParticipant()` 前に呼び出し、切断タイマーのキャンセルと他参加者への通知も実行
- **クイズ中の参加者一覧サイドバー**: `playing` / `revealing` フェーズで画面右側に参加者一覧を常時表示。ホストバッジ・接続状態も確認可能。モバイルではメイン下にスタック表示（レスポンシブ対応）

### Fixed

- **別タブからの新規参加によるタブセッション制御バイパス**: 同一ブラウザの別タブから新しいニックネームで同じルームに参加できてしまうバグを修正（ADR-0005）。3層防御で対策:
  1. **クライアント**: `JoinRoomPage` で `TabSession.hasActiveTab()` をチェックし、アクティブタブがある場合は参加をブロック
  2. **クライアント**: `RoomPage` マウント時に `claim()` を無条件実行し、JoinRoomPage 経由の遷移でも旧タブに yield を通知
  3. **サーバ**: `clientId`（ブラウザ単位の UUID、localStorage 永続化）による重複参加検出。`RoomAggregate.addParticipant()` で同一 `clientId` の接続中参加者がいる場合 `DUPLICATE_CLIENT` エラーを返却
- **回答状況リアルタイム表示**: クイズ進行中に各参加者の回答状態（✓ 回答済み / ⏳ 回答中）をリアルタイムに表示。`AnswerCountPayload` / `CurrentQuestionInfo` に `answeredNicknames` フィールドを追加し、再接続時の状態復元にも対応
- **自分のニックネーム強調表示**: 全フェーズ（ロビー・クイズ中）の参加者一覧で、自分の行を `ring-2 ring-indigo-400` で強調し「(あなた)」ラベルを表示
- `QuizAggregate.getAnsweredParticipantIds()` メソッド追加（現在の問題に対する回答済み参加者 ID 一覧を返す）
- `ParticipantList` コンポーネントに `mode` / `currentNickname` / `answeredNicknames` props を追加し、ロビー・クイズ中の表示を切り替え可能に
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
