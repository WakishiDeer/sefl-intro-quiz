# Copilot Instructions: Self-Intro Quiz

このファイルは GitHub Copilot Chat がコードベースを理解するための指示書です。

---

## プロジェクト概要

参加者の自己紹介情報をもとに AI が4択クイズを自動生成するリアルタイム Web アプリ。
社内懇親会やアイスブレイク向け。最大20人、10問固定。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express + Socket.IO v4 |
| AI | Azure OpenAI API (GPT-5.1) |
| 状態管理 | Zustand (client) / InMemory Map (server) |
| バリデーション | Zod (shared) |
| ログ | pino |
| テスト | Vitest |
| モノレポ | npm workspaces |
| ビルド | tsup (server) / Vite (client) |
| 言語 | TypeScript (全層 strict mode) |

## モノレポ構成

```
packages/
├── shared/    → 型定義・定数・バリデーションスキーマ（server/client 両方が依存）
├── server/    → Express + Socket.IO サーバ
└── client/    → React SPA
```

## アーキテクチャ（DDD + Ports & Adapters）

### Bounded Context

| Context | Aggregate | 責務 |
|---|---|---|
| **Room Context** | `Room` | ルーム作成・参加者管理・Host 権限・フェーズ遷移 |
| **Quiz Context** | `Quiz` | クイズ生成・出題進行・回答受付・スコア計算 |

- 2 つのコンテキストは `roomCode` を Correlation ID として疎結合に連携
- Quiz Context は Room Context の `participants` を読み取り専用で参照

### サーバ側レイヤー構成

```
packages/server/src/
├── index.ts               # エントリポイント（DI 組み立て）
├── domain/                # ドメイン層（外部依存なし）
│   ├── room/
│   │   ├── RoomAggregate.ts
│   │   ├── RoomAggregate.test.ts
│   │   └── RoomRepository.ts    # Port (interface)
│   └── quiz/
│       ├── QuizAggregate.ts
│       ├── QuizAggregate.test.ts
│       ├── QuizGenerator.ts      # Port (interface)
│       └── QuizRepository.ts     # Port (interface)
├── application/           # アプリケーション層（イベントハンドラ）
│   ├── roomHandlers.ts
│   └── quizHandlers.ts
├── infrastructure/        # インフラ層（Port の実装）
│   ├── InMemoryRoomRepository.ts
│   ├── InMemoryRoomRepository.test.ts
│   ├── InMemoryQuizRepository.ts
│   ├── InMemoryQuizRepository.test.ts
│   ├── AzureOpenAIQuizGenerator.ts
│   ├── AzureOpenAIQuizGenerator.test.ts
│   ├── AzureOpenAIProfileFieldSuggester.ts
│   ├── StubQuizGenerator.ts
│   ├── StubQuizGenerator.test.ts
│   ├── StubProfileFieldSuggester.ts
│   ├── StubProfileFieldSuggester.test.ts
│   └── NodeTimerService.ts
└── utils/
    ├── roomCode.ts
    ├── roomCode.test.ts
    ├── sanitize.ts
    ├── sanitize.test.ts
    └── logger.ts
```

### shared パッケージの型ファイル分割

```
packages/shared/src/types/
├── room.ts       → RoomPhase, Participant, Room
├── quiz.ts       → Quiz, Question, Answer, ScoreEntry
├── profile.ts    → Profile
└── sync.ts       → RoomStateSync, イベントペイロード
```

## コーディング規約

### 全般

- TypeScript strict mode を必ず有効にする
- `any` は使用禁止。`unknown` + 型ガードで対処する
- インポートパスは `@self-intro-quiz/shared` のようなパッケージ名を使う
- 日本語コメントOK（チーム内ドキュメントも日本語）

### ドメインオブジェクトの実装スタイル

ドメインオブジェクト（Aggregate, Entity, Value Object）は **class** で実装する。
plain な `type` / `interface` + 関数で済ませず、振る舞い（メソッド）をオブジェクト自身に持たせること。

- **Aggregate / Entity**: `class` で実装。ドメインロジック（バリデーション・状態遷移・計算）はメソッドに集約
- **Value Object**: `class` で実装。コンストラクタでバリデーション、`equals()` で等価比較、イミュータブルに保つ
- **Port（境界）**: `interface` で定義。ドメイン層に配置し、Infrastructure 層で `class implements` する
- **DTO / ペイロード**: `interface` or `type` でOK（振る舞いを持たない純粋なデータ転送用）

```typescript
// ❌ Bad: function + type で Value Object を表現
type Profile = { hometown: string; hobbies: string; ... };
function validateProfile(p: Profile): boolean { ... }
function sanitizeProfile(p: Profile): Profile { ... }

// ✅ Good: class で Value Object を表現
class Profile {
  readonly hometown: string;
  readonly hobbies: string;

  constructor(props: ProfileProps) {
    // コンストラクタでバリデーション + サニタイズ
    this.hometown = sanitize(props.hometown);
    this.hobbies = sanitize(props.hobbies);
    this.validate();
  }

  private validate(): void {
    if (this.hometown.length > MAX_FIELD_LENGTH) {
      throw new DomainError("PROFILE_INVALID", "hometown が長すぎます");
    }
  }

  equals(other: Profile): boolean {
    return this.hometown === other.hometown && this.hobbies === other.hobbies;
  }
}

// ✅ Good: Port は interface で定義
interface QuizGenerator {
  generate(participants: ParticipantProfile[]): Promise<Question[]>;
}

// ✅ Good: Infrastructure で class implements
class AzureOpenAIQuizGenerator implements QuizGenerator {
  async generate(participants: ParticipantProfile[]): Promise<Question[]> { ... }
}
```

### コメント規約

コメントは「未来の自分・チームメイトへの手紙」として必ず書く。

- **ファイル先頭**: モジュールの責務を1〜2行で説明する
- **クラス / インターフェース**: 何を表現するか、どのコンテキストに属するかを JSDoc で記述
- **public メソッド**: 引数・戻り値・副作用を JSDoc で記述。特に「なぜこの処理が必要か」を明記
- **複雑なロジック**: 意図（Why）を書く。処理内容（What）はコードから読めるので書かない
- **TODO / FIXME / HACK**: 理由と対処方針を必ず添える（例: `// TODO: Redis 移行時に TTL 管理を移譲する`）
- **マジックナンバー禁止**: 定数化して名前で意図を表現する。やむを得ない場合はコメントで根拠を添える

```typescript
// Bad
if (participants.size >= 3) { ... }

// Good
if (participants.size >= MIN_PARTICIPANTS) { ... }

// やむを得ない場合
const CHARSET_SIZE = 32; // 紛らわしい文字 (0, O, I, l, 1) を除外した英数字数
```

### サーバ側

- ドメインロジックは Aggregate クラスに集約する（Anemic Domain Model 禁止）
- Port（interface）は `domain/` に配置、実装は `infrastructure/` に配置
- `infrastructure/` のクラスを `domain/` から直接 import しない
- イベントハンドラ（`application/`）は薄く保つ — Aggregate に委譲
- 全入力を Zod でバリデーションしてからドメインに渡す
- ユーザー入力は `sanitize-html` でサニタイズ（Profile 等）
- ログは `pino` の構造化ログ。`roomCode`, `participantId` を必ず付与

### クライアント側

- ページコンポーネントは `pages/` に、再利用コンポーネントは `components/` に
- 状態管理は Zustand（`useRoomStore`, `useQuizStore`）
- Socket.IO 接続は `lib/socket.ts` で一元管理
- `/room/:roomCode` は `phase` に応じて表示を切り替える（URL 遷移なし）
- タイマーは `requestAnimationFrame` ベース（サーバの `timerEndsAt` から計算）

### テスト

**コード変更時は必ず対応するテストも作成・更新すること。**テストのないコードはレビュー対象外とする。

- Vitest を使用
- `QuizGenerator` Port に `MockQuizGenerator` を注入してテスト
- Aggregate のドメインロジックは単体テスト必須

#### テスト対象と方針

| 対象 | テスト種別 | 必須度 | 方針 |
|---|---|---|---|
| Aggregate（`RoomAggregate`, `QuizAggregate`） | ユニットテスト | **必須** | 全 public メソッドに対してテストを書く。正常系・異常系・境界値 |
| Port 実装（`InMemoryRoomRepository` 等） | ユニットテスト | **必須** | CRUD 操作の検証 |
| Zod バリデーションスキーマ | ユニットテスト | **必須** | 有効値・無効値のパターンを網羅 |
| イベントハンドラ（`application/`） | 統合テスト | 推奨 | Aggregate + Repository をモック注入して検証 |
| ユーティリティ（`roomCode.ts`, `sanitize.ts`） | ユニットテスト | **必須** | エッジケースを含めて検証 |

#### テスト作成のルール

- **新規関数・メソッド追加時**: 同時にテストファイルを作成する
- **バグ修正時**: まず失敗するテストを書き、修正後にパスすることを確認する（TDD）
- **テストファイル配置**: 対象ファイルと同階層に `*.test.ts` として配置
- **テスト命名**: `describe("クラス名/関数名")` → `it("〜の場合、〜する")` の日本語記述OK
- **AAA パターン**: Arrange（準備）→ Act（実行）→ Assert（検証）の構造を守る

```typescript
// 例: RoomAggregate のテスト
describe("RoomAggregate", () => {
  describe("addParticipant", () => {
    it("ニックネームが重複する場合、エラーをスローする", () => {
      // Arrange
      const room = createTestRoom();
      room.addParticipant("Alice", "socket-1");

      // Act & Assert
      expect(() => room.addParticipant("Alice", "socket-2"))
        .toThrow("NICKNAME_TAKEN");
    });
  });
});
```

## Room Phase 遷移

```
lobby → generating → playing ⇄ revealing ⇄ interviewing → finished
```

- Host のみがフェーズ遷移をトリガーできる
- `playing → revealing` はサーバが自動実行（全員回答 or タイムアウト）
- `revealing → interviewing` は Host が `quiz:next-question` を押した時、「気になる」投票が50%以上なら自動遷移
- `interviewing → playing/finished` は1分タイマー満了で自動、または Host が `quiz:next-question` で手動スキップ

## Socket.IO イベント

- Client→Server: 9 イベント（`room:create`, `room:join`, `room:leave`, `profile:submit`, `quiz:generate`, `quiz:next-question`, `quiz:vote-curious`, `question:answer`, `room:close`）
- Server→Client: 16+ イベント
- 詳細は `docs/api-events.md` を参照

## ドキュメント体系

| ドキュメント | 内容 | 優先度 |
|---|---|---|
| `docs/prd.md` | プロダクト仕様（ユーザーストーリー・機能要件） | 基本 |
| `docs/technical-design.md` | 技術スタック・プロジェクト構成・開発フェーズ | 基本 |
| `docs/api-events.md` | Socket.IO イベント仕様（ペイロード・エラーコード） | 基本 |
| `docs/tech-spec.md` | 実装詳細（DDD設計・AI プロンプト・セキュリティ） | **最優先**（差分がある場合） |
| `docs/adr/` | Architecture Decision Records | 意思決定の記録 |
| `CHANGELOG.md` | 変更履歴 | 必須 |

## 変更履歴（CHANGELOG）

- **全ての意味のある変更**に対して `CHANGELOG.md` を更新すること
- フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に準拠
- セクション: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`
- バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う
- コード変更のコミット時に CHANGELOG も同時に更新する

## ADR（Architecture Decision Records）

- 重要なアーキテクチャ上の意思決定は `docs/adr/NNNN-title.md` に記録する
- 判断基準: 「後から見て『なぜこの選択をしたのか？』と疑問に思う可能性がある決定」
- フォーマット: Title / Status / Context / Decision / Consequences
- 番号は連番（`0001`, `0002`, ...）
- Status: `proposed` → `accepted` → `deprecated` / `superseded`

### ADR を書くべき場面の例

- ライブラリ・フレームワークの選定（例: Zustand vs Redux）
- アーキテクチャパターンの採用（例: DDD, Ports & Adapters）
- データモデルの大きな変更
- セキュリティ方針の決定
- パフォーマンスに影響する設計判断

## 環境変数

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=...     # 必須（AI使用時）
AZURE_OPENAI_DEPLOYMENT=gpt-51
AI_PROVIDER=azure-openai      # azure-openai / no-ai
PORT=3001
CLIENT_URL=http://localhost:5173
LOG_LEVEL=info
MIN_PARTICIPANTS=3            # dev: 2
QUESTION_TIME_LIMIT=30000     # ms
ROOM_TIMEOUT_MINUTES=30
NODE_ENV=development
```

## 注意事項

- MVP はインメモリストア（サーバ再起動でデータ消失）
- DB なし — 将来 Redis 移行パスあり（Socket.IO Redis Adapter + Repository 差し替え）
- Azure OpenAI API Key は `.env` に格納し、Git にコミットしない
- `timerHandle` はドメインモデル外（`NodeTimerService` で管理）
