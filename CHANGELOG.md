# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/ja/).

## [Unreleased]

### Added

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

### Changed

- AI プロバイダーを OpenAI GPT-4o-mini から Anthropic Claude Sonnet 4.5 に変更（ADR-0002）
- `OpenAIQuizGenerator` → `ClaudeQuizGenerator` にリネーム
- 環境変数 `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` に変更
- サーバ依存パッケージ `openai` → `@anthropic-ai/sdk` に変更
