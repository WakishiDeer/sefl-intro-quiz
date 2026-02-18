# 0001: DDD + Ports & Adapters アーキテクチャの採用

## Status

accepted

## Context

Self-Intro Quiz の MVP 開発において、サーバ側の設計パターンを選定する必要があった。

初期案ではフラットな `services/` + `models/` 構成を検討していたが、以下の課題が識別された:

1. **Room が God Object 化する** — ルーム管理、クイズ進行、タイマー管理が単一の `Room` インターフェースに集約され、責務が肥大化する
2. **AI 依存がテストを困難にする** — Claude API が `aiService.ts` に直接結合し、ユニットテスト時にモックが困難
3. **`timerHandle` がドメインモデルにインフラ関心事を持ち込む** — `ReturnType<typeof setTimeout>` が Node.js 固有の型であり、ドメインの純粋性を損なう
4. **将来の Redis 移行時に広範な変更が必要になる** — `RoomStore` が具象クラスで依存性逆転が効かない

一方で、NestJS のような大規模フレームワークは MVP の 20 人規模アプリには過剰。
Express + 手動構造化で DDD の戦術的パターンのみを適度に取り入れるアプローチを検討。

## Decision

以下の設計パターンを採用する:

1. **Bounded Context の分割**: Room Context（ルーム・参加者管理）と Quiz Context（クイズ進行・スコア計算）に分離
2. **Aggregate パターン**: `RoomAggregate` と `QuizAggregate` にドメインロジックを集約
3. **Ports & Adapters（Hexagonal Architecture）**: ドメイン層に Port（interface）を定義し、Infrastructure Layer で実装
   - `RoomRepository` → `InMemoryRoomRepository`
   - `QuizGenerator` → `ClaudeQuizGenerator` / `MockQuizGenerator`
   - `QuizRepository` → `InMemoryQuizRepository`
4. **インフラ関心事の分離**: `timerHandle` をドメインモデルから除外し、`NodeTimerService` に委譲

ディレクトリ構成:

```
packages/server/src/
├── domain/          → Aggregate + Port interfaces
├── application/     → Socket.IO イベントハンドラ（薄い層）
├── infrastructure/  → Port の具象実装
└── utils/           → 横断関心事
```

## Consequences

### Positive

- Room と Quiz の責務が明確に分離され、各 Aggregate が単体テスト可能になる
- `MockQuizGenerator` の注入により AI 依存なしでクイズ進行のテストが書ける
- 将来の Redis 移行は `InMemoryRoomRepository` → `RedisRoomRepository` の差し替えのみで対応可能
- ドメインモデルがインフラに依存しないため、ビジネスロジックの変更が容易

### Negative

- ファイル数・ディレクトリ階層が増加する（`services/` 3ファイル → `domain/` 5ファイル + `infrastructure/` 4ファイル）
- DI の組み立て（`index.ts` でのワイヤリング）が手動になる（DI コンテナ未導入）
- 小規模プロジェクトに対してはやや儀式的なコードが増える

### Risks

- チームメンバーが DDD パターンに不慣れな場合、学習コストが発生する → copilot-instructions.md とドキュメントで軽減
- Aggregate 間の協調ロジックが複雑化する可能性がある → roomCode による疎結合で最小化
