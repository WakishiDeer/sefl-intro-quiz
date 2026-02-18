# 🎯 Self-Intro Quiz（自己紹介クイズ）

参加者が入力した自己紹介情報をもとに、AIが自動生成するクイズで盛り上がる Web アプリケーション。

## 機能

- ルームを作成して参加者を招待（Room Code 共有）
- 参加者がプロフィール（趣味・特技・出身地 等）を入力
- AI（Claude Sonnet 4.5）が4択クイズを10問自動生成
- リアルタイムでクイズに回答、スコアボードで競争
- 途中参加OK（次の問題から即参加可能）

## 想定シーン

- 社内懇親会・キックオフ
- 勉強会・カンファレンスのアイスブレイク
- オンライン飲み会
- 新入社員研修

## 技術スタック

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **AI**: Anthropic Claude API (Sonnet 4.5)
- **Language**: TypeScript (全層)
- **Monorepo**: npm workspaces
- **Architecture**: DDD (Bounded Context: Room / Quiz)

## プロジェクト構成

```
packages/
├── shared/    # 共有型定義・定数・イベント名
├── server/    # Express + Socket.IO サーバ
│   ├── domain/          # Aggregate・Port インターフェース
│   ├── application/     # イベントハンドラ
│   └── infrastructure/  # InMemory実装・Claude API・Timer
└── client/    # React SPA
```

## セットアップ

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env に ANTHROPIC_API_KEY を設定

# 開発サーバ起動
npm run dev
```

## ドキュメント

- [PRD（プロダクト仕様書）](docs/prd.md)
- [技術設計書](docs/technical-design.md)
- [Socket.IO イベント仕様書](docs/api-events.md)
- [Tech Spec（技術仕様書）](docs/tech-spec.md)
- [ADR（Architecture Decision Records）](docs/adr/)
- [CHANGELOG](CHANGELOG.md)

## ライセンス

MIT
