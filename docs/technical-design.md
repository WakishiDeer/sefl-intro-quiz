# 技術設計書: Self-Intro Quiz

> **Version**: 0.1.0
> **Last Updated**: 2026-02-18

---

## 1. 技術スタック

| レイヤー | 技術 | 理由 |
|---|---|---|
| フロントエンド | React 19 + Vite | 軽量・高速。TypeScript ネイティブサポート |
| UI | Tailwind CSS v4 | ユーティリティファーストで迅速なUI構築 |
| バックエンド | Node.js + Express | TypeScript 統一。Socket.IO との相性◎ |
| リアルタイム通信 | Socket.IO v4 | WebSocket + フォールバック。Room 機能内蔵 |
| AI | Anthropic Claude API (Sonnet 4.5) | 高品質な日本語対応。創造的なクイズ生成に強い |
| サーバ状態管理 | インメモリ (Map) | DB不要。MVP 向け |
| クライアント状態管理 | Zustand | 軽量。Socket.IO との連携容易 |
| モノレポ | npm workspaces | 型定義の共有 |
| ビルド | tsup (server) / Vite (client) | 高速ビルド |
| テスト | Vitest | Vite エコシステム統一 |

---

## 2. プロジェクト構成

```
wdp-self-intro-quiz/
├── docs/                          # ドキュメント
│   ├── prd.md
│   ├── technical-design.md
│   ├── api-events.md
│   └── tech-spec.md
├── packages/
│   ├── shared/                    # 共有型定義・定数
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── room.ts        # RoomPhase, Participant, Room
│   │   │   │   ├── quiz.ts        # Quiz, Question, Answer, ScoreEntry
│   │   │   │   ├── profile.ts     # Profile
│   │   │   │   └── sync.ts        # RoomStateSync, Payloads
│   │   │   ├── constants.ts       # マジックナンバー定義
│   │   │   ├── events.ts          # Socket.IO イベント名定義
│   │   │   ├── validation.ts      # Zod スキーマ
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── server/                    # Express + Socket.IO サーバ
│   │   ├── src/
│   │   │   ├── index.ts               # エントリポイント（DI 組み立て）
│   │   │   ├── domain/                # ドメイン層
│   │   │   │   ├── room/
│   │   │   │   │   ├── RoomAggregate.ts   # Room 集約（ドメインロジック）
│   │   │   │   │   └── RoomRepository.ts  # Port（インターフェース）
│   │   │   │   └── quiz/
│   │   │   │       ├── QuizAggregate.ts   # Quiz 集約（ドメインロジック）
│   │   │   │       ├── QuizGenerator.ts   # Port（インターフェース）
│   │   │   │       └── QuizRepository.ts  # Port（インターフェース）
│   │   │   ├── application/           # アプリケーション層
│   │   │   │   ├── roomHandlers.ts    # Room 系イベントハンドラ
│   │   │   │   ├── quizHandlers.ts    # Quiz 系イベントハンドラ
│   │   │   │   └── middleware.ts      # 認証・バリデーション
│   │   │   ├── infrastructure/        # インフラ層
│   │   │   │   ├── InMemoryRoomRepository.ts
│   │   │   │   ├── InMemoryQuizRepository.ts
│   │   │   │   ├── ClaudeQuizGenerator.ts
│   │   │   │   └── NodeTimerService.ts
│   │   │   └── utils/
│   │   │       ├── roomCode.ts        # Room Code 生成
│   │   │       ├── sanitize.ts        # 入力サニタイズ
│   │   │       └── logger.ts          # pino ロガー
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/                    # React SPA
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── pages/
│       │   │   ├── TopPage.tsx
│       │   │   ├── CreateRoomPage.tsx
│       │   │   ├── JoinRoomPage.tsx
│       │   │   ├── LobbyPage.tsx
│       │   │   ├── QuizPage.tsx
│       │   │   └── ResultPage.tsx
│       │   ├── components/
│       │   │   ├── ProfileForm.tsx
│       │   │   ├── ParticipantList.tsx
│       │   │   ├── QuestionCard.tsx
│       │   │   ├── ChoiceButton.tsx
│       │   │   ├── Timer.tsx
│       │   │   ├── Scoreboard.tsx
│       │   │   └── RoomCodeDisplay.tsx
│       │   ├── stores/
│       │   │   ├── useRoomStore.ts
│       │   │   └── useQuizStore.ts
│       │   ├── hooks/
│       │   │   ├── useSocket.ts
│       │   │   └── useTimer.ts
│       │   └── lib/
│       │       └── socket.ts          # Socket.IO クライアント初期化
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
├── package.json               # ルート (workspaces 定義)
├── tsconfig.base.json         # 共通 TypeScript 設定
├── .env.example
├── .gitignore
└── README.md
```

### レイヤー構成（DDD）

| レイヤー | ディレクトリ | 責務 |
|---|---|---|
| **Domain** | `domain/room/`, `domain/quiz/` | Aggregate・ドメインロジック・Port インターフェース |
| **Application** | `application/` | Socket.IO イベントハンドラ・ユースケース単位の処理 |
| **Infrastructure** | `infrastructure/` | Port の実装（InMemory, Claude API, Timer） |
| **Utils** | `utils/` | Room Code 生成・サニタイズ・ロガー |

---

## 3. サーバ状態管理

### RoomStore → RoomRepository（インメモリ）

DDD の Ports & Adapters パターンに従い、ドメイン層の Port インターフェースを Infrastructure Layer で実装する。詳細は tech-spec.md §2.6, §5.1 を参照。

```typescript
// 概念的な型定義

type RoomPhase =
  | "lobby"       // ロビー（プロフィール入力中）
  | "generating"  // クイズ生成中
  | "playing"     // クイズ進行中
  | "revealing"   // 正解発表中
  | "finished";   // 全問終了

// ---- Room Aggregate（Room Context）----

interface Room {
  code: string;                    // 6文字英数
  hostId: string;                  // Host の participantId
  phase: RoomPhase;
  participants: Map<string, Participant>;
  createdAt: number;
  lastActivityAt: number;
}

interface Participant {
  id: string;          // UUID v4
  nickname: string;
  socketId: string;    // Socket.IO の socket.id
  profile: Profile | null;
  isHost: boolean;
  joinedAtQuestion: number;  // 何問目から参加したか (-1 = ロビーから)
  isConnected: boolean;
}

interface Profile {
  hometown: string;
  hobbies: string;
  skills: string;
  favoriteFood: string;
  surprisingFact: string;
  freeText: string;
}

// ---- Quiz Aggregate（Quiz Context）----

interface Quiz {
  roomCode: string;                // 対応する Room の code
  questions: Question[];           // AI 生成後にセット（10問）
  currentQuestionIndex: number;    // 0-9, -1 = 未開始
  timerEndsAt: number | null;      // Unix timestamp (ms)
  answers: Map<string, Answer[]>;  // participantId → Answer[]
}

interface Question {
  index: number;       // 0-9
  text: string;        // 問題文
  choices: string[];   // 選択肢（参加者名の配列、4つ）
  correctIndex: number; // 正解の選択肢インデックス
  explanation: string;  // 解説文
  subjectId: string;   // この問題の対象となった参加者の ID
}

interface Answer {
  participantId: string;
  questionIndex: number;
  choiceIndex: number;    // -1 = 時間切れ
  isCorrect: boolean;
  answeredAt: number;     // Unix timestamp
}
```

### ストア実装方針

- `RoomRepository` (`Map<string, Room>`) でルームを管理（キー = roomCode）
- `QuizRepository` (`Map<string, Quiz>`) でクイズ状態を管理（キー = roomCode）
- 30分間活動がないルームを `setInterval` で定期削除
- 参加者の識別は `participantId`（UUID）ベース
  - 再接続時はニックネーム + roomCode で既存 Participant を検索し `socketId` を更新

---

## 4. タイマー設計

### サーバ権威方式

1. Host が「次の問題へ」→ サーバが `timerEndsAt = Date.now() + 30000` をセット
2. `question:start` イベントで `timerEndsAt` をブロードキャスト
3. クライアントは `timerEndsAt - Date.now()` で残り時間を表示（ローカル計算）
4. サーバ側で `setTimeout(30000)` を設定し、タイムアップ時に自動で `question:reveal` を送信
5. 全員回答済みの場合は `setTimeout` をキャンセルし即座に `question:reveal`

### クライアント側

- `requestAnimationFrame` ベースのカウントダウン表示
- サーバとのズレは ±1秒許容（NTP同期は行わない）

---

## 5. AI 連携設計

### Claude API 呼び出し

```typescript
// 概念的な実装
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

async function generateQuiz(participants: Participant[]): Promise<Question[]> {
  const profiles = participants
    .filter(p => p.profile !== null)
    .map(p => ({
      id: p.id,
      nickname: p.nickname,
      profile: p.profile,
    }));

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildUserPrompt(profiles),
      },
    ],
  });

  // テキストブロックから JSON を抽出・パース + バリデーション
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const parsed = JSON.parse(text);
  return validateAndTransform(parsed);
}
```

### エラーハンドリング

1. Claude API エラー → 最大3回リトライ（exponential backoff: 1s, 2s, 4s）
2. JSON パースエラー → リトライ
3. バリデーションエラー（問題数不足等）→ リトライ
4. 3回失敗 → `quiz:generate-failed` イベントをブロードキャスト。Host に再試行ボタン表示

---

## 6. 途中参加の状態同期

### シーケンス

```
Late Joiner                    Server
    │                             │
    ├─── room:join ──────────────→│
    │                             ├── Participant 作成
    │                             │   joinedAtQuestion = currentQuestionIndex + 1
    │                             │
    │←── room:state-sync ─────────┤  (Room の全状態を送信)
    │                             │
    │←── room:participant-joined ─┤  (既存参加者にも通知)
    │                             │
    │  (次の question:start から  │
    │   通常参加者と同じフロー)   │
```

### `room:state-sync` ペイロード

```typescript
interface RoomStateSync {
  room: {
    code: string;
    phase: RoomPhase;
    hostNickname: string;
    currentQuestionIndex: number;
    totalQuestions: number;
  };
  participants: Array<{
    nickname: string;
    score: number;
    answeredCount: number;
    isHost: boolean;
    isConnected: boolean;
  }>;
  // playing/revealing 中の場合は現在の問題情報も含む
  currentQuestion?: {
    index: number;
    text: string;
    choices: string[];
    timerEndsAt: number;
    answeredCount: number;
    totalParticipants: number;
  };
  // revealing 中は正解情報も含む
  revealedAnswer?: {
    correctIndex: number;
    explanation: string;
  };
}
```

---

## 7. 開発フェーズ

| Phase | 内容 | 目安 |
|---|---|---|
| **Phase 0** | プロジェクトセットアップ（モノレポ、lint、ビルド） | 0.5日 |
| **Phase 1** | 共有型定義 + サーバ基盤（Express + Socket.IO + RoomStore） | 1日 |
| **Phase 2** | クライアント基盤（React + Router + Socket接続 + 基本画面） | 1日 |
| **Phase 3** | ロビー機能（ルーム作成/参加 + プロフィール入力） | 1日 |
| **Phase 4** | AI クイズ生成 | 0.5日 |
| **Phase 5** | クイズ進行（出題 → 回答 → 正解発表 → スコアボード） | 1.5日 |
| **Phase 6** | 途中参加 + 状態同期 | 1日 |
| **Phase 7** | 結果画面 + ルーム破棄 + エッジケース対応 | 0.5日 |
| **Phase 8** | UI 磨き込み + テスト | 1日 |
| **合計** | | **約8日** |
