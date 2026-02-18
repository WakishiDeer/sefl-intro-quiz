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

### Changed

- AI プロバイダーを OpenAI GPT-4o-mini から Anthropic Claude Sonnet 4.5 に変更（ADR-0002）
- `OpenAIQuizGenerator` → `ClaudeQuizGenerator` にリネーム
- 環境変数 `OPENAI_API_KEY` → `ANTHROPIC_API_KEY` に変更
- サーバ依存パッケージ `openai` → `@anthropic-ai/sdk` に変更
