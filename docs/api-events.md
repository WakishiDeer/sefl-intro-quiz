# Socket.IO イベント仕様書

> **Version**: 0.1.0
> **Last Updated**: 2026-02-18

---

## イベント一覧

### Client → Server

| イベント名 | 送信者 | ペイロード | 説明 |
|---|---|---|---|
| `room:create` | Any | `{ nickname: string }` | ルーム作成 |
| `room:join` | Any | `{ roomCode: string, nickname: string }` | ルーム参加 |
| `room:leave` | Participant | `{}` | ルーム退出 |
| `profile:submit` | Participant | `{ profile: Profile }` | プロフィール保存 |
| `quiz:generate` | Host | `{}` | クイズ生成トリガー |
| `quiz:next-question` | Host | `{}` | 次の問題へ進む |
| `question:answer` | Participant | `{ questionIndex: number, choiceIndex: number }` | 回答送信 |
| `room:close` | Host | `{}` | ルームを閉じる |
| `room:list-subscribe` | Any | `{}` | ルーム一覧のリアルタイム購読開始 |
| `room:list-unsubscribe` | Any | `{}` | ルーム一覧の購読解除 |
| `room:check-nickname` | Any | `{ roomCode: string, nickname: string }` | ニックネーム重複事前チェック |

### Server → Client

| イベント名 | 送信先 | ペイロード | 説明 |
|---|---|---|---|
| `room:created` | Sender | `{ roomCode: string, participantId: string }` | ルーム作成完了 |
| `room:joined` | Sender | `{ participantId: string, roomState: RoomStateSync }` | ルーム参加完了 |
| `room:participant-joined` | Room | `{ nickname: string, participantCount: number }` | 参加者入室通知 |
| `room:participant-left` | Room | `{ nickname: string, participantCount: number }` | 参加者退出通知 |
| `room:state-sync` | Sender | `RoomStateSync` | 途中参加者への全状態同期 |
| `room:closed` | Room | `{}` | ルーム閉鎖通知 |
| `room:error` | Sender | `{ code: string, message: string }` | エラー通知 |
| `profile:updated` | Room | `{ nickname: string, hasProfile: boolean }` | プロフィール更新通知 |
| `quiz:generating` | Room | `{}` | クイズ生成開始 |
| `quiz:ready` | Room | `{ totalQuestions: number }` | クイズ生成完了 |
| `quiz:generate-failed` | Room | `{ message: string }` | クイズ生成失敗 |
| `question:start` | Room | `QuestionStartPayload` | 問題出題開始 |
| `question:answer-count` | Room | `{ answeredCount: number, totalCount: number }` | 回答状況更新 |
| `question:reveal` | Room | `QuestionRevealPayload` | 正解発表 |
| `quiz:finished` | Room | `QuizFinishedPayload` | 全問終了・最終結果 |
| `room:list` | Subscribers | `RoomListPayload` | ルーム一覧（リアルタイム更新） |
| `room:nickname-result` | Sender | `{ available: boolean, roomCode: string, nickname: string }` | ニックネーム重複チェック結果 |

---

## ペイロード詳細

### Profile

```typescript
interface Profile {
  hometown: string;      // 出身地 (max 100文字)
  hobbies: string;       // 趣味 (max 100文字)
  skills: string;        // 特技 (max 100文字)
  favoriteFood: string;  // 好きな食べ物 (max 100文字)
  surprisingFact: string; // 意外な事実 (max 100文字)
  freeText: string;      // 自由記述 (max 100文字)
}
```

### RoomSummary / RoomListPayload

```typescript
interface RoomSummaryParticipant {
  nickname: string;
  isConnected: boolean;
}

interface RoomSummary {
  code: string;
  phase: "lobby" | "generating" | "playing" | "revealing" | "finished";
  hostNickname: string;
  participants: RoomSummaryParticipant[];
  participantCount: number;
  maxParticipants: number;  // 20
  createdAt: number;        // Unix timestamp (ms)
}

interface RoomListPayload {
  rooms: RoomSummary[];
}
```

### CheckNicknamePayload / NicknameResultPayload

```typescript
// Client → Server
interface CheckNicknamePayload {
  roomCode: string;   // 6文字英数大文字
  nickname: string;   // 2〜12文字
}

// Server → Client
interface NicknameResultPayload {
  available: boolean;  // true = 使用可能, false = 重複 or ルーム不在
  roomCode: string;
  nickname: string;
  reason?: "ROOM_NOT_FOUND" | "NICKNAME_TAKEN";  // available: false の理由
}
```

- ルームに join していなくても発行可能な読み取り専用チェック
- ルームが存在しない場合は `available: false, reason: "ROOM_NOT_FOUND"` を返す
- ニックネーム重複の場合は `available: false, reason: "NICKNAME_TAKEN"` を返す
- 比較は case-insensitive（`"Alice"` と `"alice"` は重複扱い）
- 切断中の参加者は重複対象外（再接続扱いになるため）

### RoomStateSync

```typescript
interface RoomStateSync {
  room: {
    code: string;
    phase: "lobby" | "generating" | "playing" | "revealing" | "finished";
    currentQuestionIndex: number;  // -1 if not started
    totalQuestions: number;        // 10
  };
  participants: Array<{
    nickname: string;
    score: number;
    answeredCount: number;
    totalQuestions: number;   // この人が回答可能だった問題数
    isHost: boolean;
    isConnected: boolean;
    hasProfile: boolean;
  }>;
  currentQuestion?: {
    index: number;
    text: string;
    choices: string[];
    timerEndsAt: number;   // Unix timestamp (ms)
    answeredCount: number;
    totalParticipants: number;
  };
  revealedAnswer?: {
    correctIndex: number;
    explanation: string;
    scores: ScoreEntry[];
  };
  self: {
    participantId: string;
    nickname: string;
    isHost: boolean;
    joinedAtQuestion: number;
  };
}
```

### QuestionStartPayload

```typescript
interface QuestionStartPayload {
  questionIndex: number;    // 0-9
  text: string;             // 問題文
  choices: string[];        // 選択肢（参加者名、4つ）
  timerEndsAt: number;      // Unix timestamp (ms)
  questionNumber: number;   // 表示用 (1-10)
  totalQuestions: number;   // 10
}
```

### QuestionRevealPayload

```typescript
interface QuestionRevealPayload {
  questionIndex: number;
  correctIndex: number;      // 正解の選択肢インデックス
  explanation: string;       // 解説文
  correctParticipants: string[];  // 正解者のニックネーム一覧
  scores: ScoreEntry[];      // 現在のスコアボード
}
```

### ScoreEntry

```typescript
interface ScoreEntry {
  nickname: string;
  score: number;
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;    // 回答可能だった問題数
  isLateJoiner: boolean;
  rank: number;
}
```

### QuizFinishedPayload

```typescript
interface QuizFinishedPayload {
  finalScores: ScoreEntry[];
  totalQuestions: number;
}
```

---

## エラーコード

| コード | 説明 |
|---|---|
| `ROOM_NOT_FOUND` | 指定された Room Code のルームが存在しない |
| `ROOM_FULL` | ルームが満員（20人） |
| `NICKNAME_TAKEN` | 同じニックネームが既に使われている |
| `NICKNAME_INVALID` | ニックネームが無効（2〜12文字でない） |
| `NOT_HOST` | Host 権限が必要な操作を Host 以外が実行 |
| `INVALID_PHASE` | 現在のフェーズでは許可されない操作 |
| `ALREADY_ANSWERED` | 同じ問題に既に回答済み |
| `QUESTION_CLOSED` | 出題が終了している（時間切れ） |
| `PROFILE_INVALID` | プロフィール入力が不正（文字数超過等） |
| `MIN_PARTICIPANTS` | クイズ生成に必要な最低人数（3人）に満たない |
| `QUIZ_ALREADY_GENERATED` | クイズは既に生成済み |

---

## シーケンス図

### 通常フロー（開始から終了まで）

```
Host                Server              Participant
 │                    │                      │
 ├── room:create ────→│                      │
 │←── room:created ───┤                      │
 │                    │←── room:join ─────────┤
 │←── participant ────┤───→ room:joined ─────→│
 │    -joined         │                      │
 │                    │←── profile:submit ────┤
 │←── profile ────────┤───→ profile:updated ─→│
 │    :updated        │                      │
 ├── quiz:generate ──→│                      │
 │←── quiz ───────────┤───→ quiz:generating ─→│
 │    :generating     │                      │
 │                    │ (AI 生成中...)        │
 │←── quiz:ready ─────┤───→ quiz:ready ──────→│
 │                    │                      │
 ├── quiz:next ──────→│                      │
 │    -question       │                      │
 │←── question ───────┤───→ question:start ──→│
 │    :start          │                      │
 │                    │←── question:answer ───┤
 │←── question ───────┤───→ question ────────→│
 │    :answer-count   │    :answer-count      │
 │                    │                      │
 │  (全員回答 or タイムアップ)                │
 │←── question ───────┤───→ question ────────→│
 │    :reveal         │    :reveal            │
 │                    │                      │
 │  (10問繰り返し)                            │
 │                    │                      │
 │←── quiz ───────────┤───→ quiz:finished ───→│
 │    :finished       │                      │
 ├── room:close ─────→│                      │
 │←── room:closed ────┤───→ room:closed ─────→│
```

### 途中参加フロー

```
                    Server              Late Joiner
                      │                      │
  (Q3 出題中...)      │                      │
                      │←── room:join ─────────┤
                      │                      │
                      │   joinedAtQuestion    │
                      │   = 4 (次の問題)      │
                      │                      │
                      │───→ room:joined ─────→│
                      │   (RoomStateSync      │
                      │    含む: phase,       │
                      │    currentQuestion,   │
                      │    scores)            │
                      │                      │
                      │───→ room:participant  │
                      │    -joined (既存へ)   │
                      │                      │
  (Q3 正解発表)       │                      │
                      │───→ question:reveal ─→│
                      │                      │
  (Q4 開始)           │                      │
                      │───→ question:start ──→│
                      │  ← ここから回答可能   │
                      │←── question:answer ───┤
```
