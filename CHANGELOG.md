# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/ja/).

## [Unreleased]

### Fixed

- **絵文字が黒色（モノクロ）で表示される問題を修正**: Web フォントに Noto Sans JP（Google Fonts CDN）を導入し、フォントスタックでカラー絵文字フォント（`Segoe UI Emoji` / `Apple Color Emoji` / `Noto Color Emoji`）を `system-ui` より前に配置。Windows 環境で `Segoe UI` がモノクロ絵文字を描画する問題を解消し、SpotlightEffect の decorEmojis 等がカラー表示されるようになった

- **AI リクエスト採用後にプロフィール提出済み人数が更新されない不具合を修正**: フィールド変更でプロフィールが無効化された際、`participants[*].hasProfile` がクリアされず「プロフィール提出済み: N人」が旧値のまま表示される問題を修正。`setProfileFields` で `profilesInvalidated: true` の場合、全参加者の `hasProfile` を `false` にリセットするようにした

### Added

- **スピードボーナス & ストリーク倍率スコアリング**: ゲーム性を高める新スコアリングシステムを導入
  - **スピードボーナス**: 早い回答ほど高スコア。正解時の最低 100pt + 残り時間に比例して最大 900pt のボーナス（合計最大 1,000pt/問）
  - **連続正解ストリーク倍率**: 連続正解でスコアに倍率が適用される（2連: x1.2、3連: x1.5、4連: x1.8、5連以上: x2.0）
  - 回答結果バッジに獲得ポイント・ストリーク表示（🔥x1.5 等）を追加
  - スコアボードに最長連続正解数（🔥列）を追加

### Changed

- **party テーマを「ネオンナイト / ディスコパーティー」にリデザイン**:
  - カラースキームを fuchsia/pink → **violet (パープル) + amber (ゴールド)** に変更し、sakura テーマとの色域重複を解消
  - 背景エフェクト: 浮遊する丸ドット (`AmbientParticles`) → **`PartyLights`** — 回転するカラフルなライトビーム + ダイヤモンド型のディスコボール反射光
  - 正解エフェクト: 汎用紙吹雪 (`ConfettiEffect`) → **`FireworksBurst`** — 画面の複数箇所で花火が時間差で打ち上がりパーティクルが軌跡を残しながらフェードアウト + 祝福テキスト
  - インタビュースポットライト: fuchsia → violet + amber ゴールドグローに変更

- **スピーチタイム（interviewing フェーズ）の自動遷移を廃止**: 60秒タイマー満了による自動的なフェーズ遷移を削除し、Host が手動で「次の問題へ」を押すまでスピーチタイムが継続するように変更

### Added

- **fun テーマ専用エフェクト2種を新規作成**:
  - `PopBubbles` — カラフルな半透明バブルがふわふわ上昇する常時背景アニメーション（Canvas ベース）
  - `PopCelebration` — 正解時にカラフルな星・丸が画面中央から放射状に飛び散り、「GREAT!」「NICE!」等のポップなテキストが表示される全画面祝福演出（Canvas ベース）
- **スピーチタイム（interviewing フェーズ）にスポットライト演出を追加**: 暗転 → スポットライト照射 → 名前ドーン → 絵文字飛散、というステージ登壇風のイントロアニメーション
  - `SpotlightEffect` コンポーネント — 暗幕 + スポットライト + 名前テキスト + デコ絵文字飛散のフルスクリーン演出
  - 対象者の名前がスポットライトの中心でグロー付きで大きく表示される
  - `effects.onInterview` をテーマ型 (`AnimationThemeConfig`) に追加（対象者名を引数で受け取る）
  - 全 5 テーマにテーマ特性に合わせたスポットライト・デコ設定を実装:
    - **subtle**: 白い拡散光 + ✨💬 （控えめ 8 個）
    - **fun**: ライムグリーンのスポット + ⭐🌟🎵🤩 （14 個）
    - **party**: マゼンタのビーム光線 + 🎉🎊💃🕺🪩🔥 （18 個）
    - **cyber**: シアンのハードスポット + ⚡💎🔮▶◆ （10 個）
    - **sakura**: ピンクの柔らかなスポット + 🌸💮🪷✿ （15 個）
- **ThemeColors に 10 フィールドを追加**: テーマカラーの網羅性を向上（23 → 33 フィールド）
  - `modalBg` — モーダル / ダイアログ背景
  - `choiceIndexBadge` — 選択肢 A/B/C/D バッジ丸の背景色
  - `participantOnline` / `participantOffline` — 参加者オンライン / オフラインインジケータ
  - `statusOk` — 成功チェックマーク色
  - `chipSelected` / `chipDefault` — 選択済み / 未選択チップ（AI リクエストプリセット等）
  - `spinner` — ローディングスピナー
  - `progressIndicator` — 進捗表示
  - `linkText` — テキストリンク色
  - 全 5 テーマプリセット（subtle / fun / party / cyber / sakura）を対応更新

### Changed

- **fun テーマのカラーパレットをリニューアル**: amber/orange/yellow → lime/emerald/sky のネオポップ配色に変更。他テーマとの差別化を強化
  - 背景: ライムグリーン → エメラルド → スカイブルーのグラデーション
  - ボタン: エメラルド（プライマリ）× スカイブルー（アクセント）
  - テキスト: emerald-900 / sky-600 / lime-600 でカラフルに（黒い文字を排除）
  - 背景エフェクト: AmbientParticles（浮遊星）→ PopBubbles（カラフルバブル上昇アニメーション）に変更
  - 正解エフェクト: Sparkles（CSS キラキラ）→ PopCelebration（Canvas 全画面スターバースト + 祝福テキスト）に変更
  - スポットライト: amber 系 → emerald/lime 系に更新
- **コンポーネントのハードコードカラーをテーマ化**: 以下のコンポーネントで直書き Tailwind クラスを `useAnimationTheme().colors` 経由に置換
  - `ChoiceButton` — A/B/C/D バッジ色
  - `ParticipantList` — オンライン / オフラインドット、チェックマーク
  - `AIRequestModal` — 全面テーマ化（モーダル背景、スピナー、チップ、進捗表示、ボタン、テキスト、入力フォーム）
  - `AIRequestResultPanel` — 全面テーマ化（モーダル背景、入力フィールド、ボタン）
  - `ProfileFieldEditor` — 全面テーマ化（モーダル背景、入力フィールド、ボタン）
  - `LobbyView` — スピナーのテーマ化
  - `ResultView` — 「ルームを閉じる」ボタンのテーマ化
  - `RoomPage` — 接続断バナーのテーマ化

- **各問題の回答結果表示（正解・不正解一覧）**: 各クイズ問題ごとに誰が正解・不正解だったかを表示する機能を追加
  - `ParticipantAnswerResult` / `QuestionResultSummary` 型を shared パッケージに追加
  - `QuizAggregate` に `computeParticipantResults()` / `computeAllQuestionResults()` メソッドを追加
  - **revealing フェーズ**: 正解発表時に回答結果バッジ（⭕正解 / ❌不正解 / ⏰タイムアウト / ➖不参加）を表示
  - **結果画面**: 全問題の回答結果をアコーディオン形式で一覧表示（正答率付き）
  - 途中参加者は参加前の問題で「不参加」表示、切断者はタイムアウト扱いで結果に残る
  - `QuestionRevealPayload` / `QuizFinishedPayload` / `RevealedAnswerInfo` に `participantResults` を追加
  - 再接続時の状態復元にも対応（`buildRoomStateSync` で `participantResults` を含む）
  - `AnswerResultList` / `QuestionResultsList` コンポーネントを新規作成
  - `QuizAggregate.test.ts` に 9 件のユニットテストを追加（正解・不正解・タイムアウト・途中参加など）

### Fixed

- **Container Apps のレプリカ数を1に制限（ADR 0006）**: インメモリストア使用中に `maxReplicas: 3` が設定されており、複数レプリカ間で状態・Socket.IO イベントが共有されない問題を修正。`maxReplicas: 1` に変更し、防御策として `stickySessions` も追加。ルーム単位のアフィニティはインフラ層で実現不可のため、Redis 移行まで単一レプリカを維持する
- **ロビー復帰時のプロフィール復元**: クイズ終了後にロビーへ戻った際、送信済みプロフィールがフォームに復元されるように修正
  - `SelfInfo` に `profile` フィールドを追加し、`RoomStateSync` で自分のプロフィールデータを送信
  - `useRoomStore` に `myProfile` を追加し、ストアで送信済みプロフィールを保持
  - `ProfileForm` が既存プロフィールを初期値として表示、送信済み状態も復元

### Added

- **アニメーションテーマシステム**: ホストがロビーで選択可能な5種類のアニメーションテーマを導入
  - `subtle`（控えめ / デフォルト）: 上品な fade + scale で落ち着いた雰囲気
  - `fun`（楽しい）: bounce + sparkle エフェクトでクイズ番組風
  - `cyber`（サイバー）: glitch + neon glow でテック感
  - `party`（パーティー）: confetti burst + 大きな動きで盛り上がり
  - `sakura`（サクラ）: 桜の花びら + 柔らかい動きで春の雰囲気
  - `framer-motion` を client に導入、全クイズ関連コンポーネントにテーマ対応アニメーション適用
  - `ThemePicker` コンポーネントでロビーからテーマ選択可能（Host のみ変更可）
  - エフェクトコンポーネント: `Sparkles` (fun) / `Confetti` (party) / `Petals` (sakura)
  - `room:set-theme` (C2S) / `room:theme-changed` (S2C) Socket.IO イベント
  - `AnimationThemeName` 型、`SetThemeSchema` バリデーション
  - `RoomAggregate.setAnimationTheme()` メソッド（Host 権限 + lobby 限定）

- **テーマカラーパレット＆背景テーマ化**: テーマ選択時に画面全体の見た目が即座に変わる体験を実現
  - `ThemeColors` 型を新設（bgGradient, cardBg, buttonPrimary, explanationBg 等 14 フィールド）
  - 全 5 テーマにカラーパレット定義: subtle=slate, fun=amber/orange, cyber=ダーク背景(gray-950), party=fuchsia/pink, sakura=pink/rose
  - RoomPage / LobbyView / QuizView / ResultView のハードコード色を `theme.colors.*` に置換
  - テーマ選択した瞬間にロビーの背景・カード・ボタン色が変化
  - ThemePicker で各テーマのプレビュー色を表示

- **常時パーティクル（Ambient Effects）**: テーマごとの背景パーティクルを常時表示
  - `AmbientParticles` コンポーネント: Canvas ベース、形状(circle/square/star/petal)・色・方向・速度をパラメータ化
  - fun: 星形キラキラ 15 個が浮遊、cyber: 四角ドット 20 個が上昇、party: カラフル円 20 個がランダム、sakura: 花びら 12 個が舞い落ちる
  - `AnimationThemeProvider` で `effects.ambient` を常時レンダリング

- **canvas-confetti 導入**: party テーマの正解時紙吹雪を `canvas-confetti` ライブラリに置換
  - `ConfettiEffect` コンポーネント: 左右から放出する高品質な紙吹雪

- **テーマ別タイマー緊急演出**: 全テーマに `timerUrgencyClass` を定義
  - fun: amber グロー、party: fuchsia パルス＋スケール、sakura: pink グロー、cyber: サイバーグロー（既存）

### Fixed

- **AI リクエスト破棄時に他ユーザーの状態がリセットされない不具合を修正**: ホストが AI 提案結果を「破棄する」した際、サーバへの通知が欠落していたため非ホスト参加者が「AI がプロフィール項目を考え中...」のまま stuck する問題を修正
  - `ai-request:discard` イベントを新設し、サーバが全参加者に `ai-request:cancelled` (reason: `"discarded"`) をブロードキャスト
  - 非ホスト参加者に「AI 提案が破棄されました」トーストを表示

### Changed

- **4択問題に2パターンを導入**: 「〜は誰？」（選択肢＝人名）に加え、「〜さんの◯◯はどれ？」（選択肢＝プロフィール値）パターンを追加し、問題のバリエーションを向上
  - AI プロンプト（Claude / Azure OpenAI）にパターンA・Bを半々で混ぜる指示を追加
  - StubQuizGenerator も交互に両パターンを生成するよう対応
  - 新パターンのユニットテストを追加

### Removed

- **Anthropic Claude サポートを廃止**: AI プロバイダーを Azure OpenAI のみに統一
  - `ClaudeQuizGenerator`, `ClaudeProfileFieldSuggester` 実装を削除
  - `ClaudeQuizGenerator.test.ts` テストファイルを削除
  - `@anthropic-ai/sdk` 依存を削除
  - `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` 環境変数を削除
  - Bicep テンプレートから Anthropic 関連パラメータ・シークレットを削除
  - `AI_PROVIDER` のデフォルトを `no-ai` に変更（`azure-openai` で明示指定）

### Changed

- `dev:ai` スクリプトの AI_PROVIDER を `claude` → `azure-openai` に変更
- Bicep: Azure OpenAI リソースの条件分岐（`useAzureOpenAI`）を廃止し、常にデプロイするよう簡素化
- ドキュメント・コメントの Claude/Anthropic 参照を Azure OpenAI に更新

### Added

- **📊 動的クイズ問題数**: 参加者数とプロフィール項目数に基づいてクイズの問題数を自動計算する機能を追加
  - 計算式: 参加者 × 2 + フィールドボーナス（項目3つ超過ごとに+1）
  - 範囲: 最小5問 〜 最大20問（`MIN_QUESTIONS`, `MAX_QUESTIONS` 定数で管理）
  - ⭕❌問題と4択問題の比率は 40:60 を維持（`YES_NO_RATIO` 定数）
  - `calculateQuizCount()` 関数を `shared` パッケージに追加（純粋関数）
  - `QuizCountConfig` 型を追加（`totalQuestions`, `yesNoCount`, `fourChoiceCount`）
  - `QuizGenerator` ポートに `quizConfig` パラメータを追加
  - `createAIOutputSchema()` — 動的問題数に対応する Zod バリデーションファクトリを追加
  - `QuizAggregate` に `totalQuestions` ゲッターを追加
  - クライアントの `useQuizStore` に `totalQuestions` 状態を追加（サーバから受信）
  - `quizCount.test.ts` — 19テスト（基本計算・クランプ・比率・境界値・構造）
  - `QuizAggregate.test.ts` — 動的問題数サポートのテスト 4件追加

### Changed

- `QuizAggregate`: `isFinished` / `nextQuestion` が `TOTAL_QUESTIONS` 定数ではなく `questions.length` を参照するように変更
- `ClaudeQuizGenerator` / `AzureOpenAIQuizGenerator` / `StubQuizGenerator`: 動的 `QuizCountConfig` を受け取り、AI プロンプトに反映
- `AIOutputSchema`: `.length(10)` 固定 → `.min(MIN_QUESTIONS).max(MAX_QUESTIONS)` 範囲に変更
- `SubmitAnswerSchema` / `VoteCuriousSchema`: `questionIndex` の上限を `9` → `MAX_QUESTIONS - 1` に変更
- `RoomStateSync.totalQuestions`: 固定値 10 → サーバ側で動的に計算した値を使用
- `QuizView`: `TOTAL_QUESTIONS` 定数の直接参照を廃止し、ストアの `totalQuestions` を使用
- `roomHandlers.ts`: `buildRoomStateSync` で `totalQuestions` を `quizAgg.totalQuestions` から取得

- **✨ クイズハイライト（結果発表）**: 最終結果画面にクイズのハイライト情報を表示。盛り上がりポイントを自動抽出し、ゲーム終了後の振り返りを楽しくする
  - 🎯 **パーフェクト**: 全問正解者（途中参加者は回答可能問題で全問正解の場合も対象）
  - ⚡ **スピードスター**: 最速平均回答時間の参加者
  - 🔥 **連続正解王**: 最長連続正解記録（3問以上）を達成した参加者
  - 😱 **最難問**: 正答率が最も低かった問題
  - 🤔 **気になる大賞**: 「気になる」投票を最も集めた問題
  - `QuizHighlight` 型を `shared` パッケージに追加
  - `QuizFinishedPayload` に `highlights` フィールドを追加
  - `QuizAggregate` に `computeHighlights()` メソッドおよびプライベートヘルパーを追加
  - `useQuizStore` に `highlights` 状態を追加
  - `ResultView` にハイライト表示 UI を追加（グラデーション背景のカード形式）

### Changed

- **🔀 AI リクエスト プリセット拡充 & ランダム表示**: プリセット選択肢を 8 → 24 種に拡充し、毎回ランダムに 8 個を表示する方式に変更
  - テーマ別に整理: 雰囲気・難易度 / 趣味・エンタメ / 仕事・スキル / 食べ物・ライフスタイル / 旅行・場所 / 性格・価値観 / 思い出・エピソード / 想像・仮定 / ペット・動物
  - 「🔀 別の候補」ボタンで候補をシャッフル可能
  - シャッフル前に選択済みのプリセットは維持され、非表示でも送信に含まれる（選択件数を表示）
  - `AI_REQUEST_DISPLAY_COUNT` 定数を追加（表示数の一元管理）

### Added

- **🎤 気になる投票 & スピーチタイム**: 正解発表後、全参加者が「気になる👀」ボタンで対象者への関心を投票。50%以上の支持を集めると1分間のスピーチタイムが自動発動し、対面での交流を深めるきっかけに。投票数は非表示でプライバシーに配慮
  - `RoomPhase` に `"interviewing"` フェーズを追加（`revealing → [自動判定] → interviewing → playing/finished`）
  - C2S イベント `quiz:vote-curious`、S2C イベント `interview:start` を追加
  - `Quiz` 型に `curiousVotes` フィールドを追加（問題ごとの投票記録）
  - `InterviewSpeechInfo` / `InterviewStartPayload` / `VoteCuriousPayload` 型を追加
  - `INTERVIEW_SPEECH_DURATION_MS`（1分）、`CURIOUS_VOTE_THRESHOLD`（50%）定数を追加
  - `QuizAggregate` に `voteCurious()` / `hasCuriousThreshold()` / `hasVotedCurious()` メソッドを追加
  - ホストが「次の問題へ」を押した時にサーバ側で閾値判定 → 自動でスピーチタイムに遷移
  - スピーチタイムは1分タイマー付き（自動で次の問題へ進行）、ホストは手動スキップも可能
  - `RoomStateSync` に `hasVotedCurious` / `interviewSpeech` を追加（再接続時の状態復元対応）

### Fixed

- **AI リクエスト: ホストキャンセル時の状態同期**: ホストが AI リクエストをキャンセル・退出・ルーム閉鎖した際、全参加者の AI リクエスト状態も確実にリセットされるように修正
  - ホストの明示的退出（`room:leave`）時に `cancelAIRequestSession` を呼び出し
  - ルーム閉鎖（`room:close`）時に AI リクエストセッションをクリーンアップ
  - AI 生成中（`generating` 状態）にキャンセルされた場合、`cancelled` フラグで非同期結果の送信を抑止し、状態の不一致を防止
  - `executeFinalize` の重複実行を防止（全員送信時の自動 finalize とホスト手動 finalize の競合を回避）
  - 同一参加者からの AI リクエスト二重送信を拒否（`AI_REQUEST_ALREADY_SUBMITTED` エラー）

- **Azure OpenAI GPT-5.x 互換性修正**: GPT-5.1 モデルが `max_tokens` パラメータをサポートしないため、`max_completion_tokens` に変更。クイズ生成（`AzureOpenAIQuizGenerator`）とプロフィール項目提案（`AzureOpenAIProfileFieldSuggester`）の両方を修正

### Added

- **⭕❌ 2択問題（Yes/No クイズ）**: 従来の4択問題に加え、「〇〇さんは△△である。⭕か❌か？」形式の2択問題を追加。10問中4問が⭕❌問題、6問が4択問題のミックス構成で、単調にならず「どっちだ！？」と盛り上がれるクイズ体験に
  - `QuestionType` 型（`"four-choice" | "yes-no"`）を `@self-intro-quiz/shared` に追加
  - `Question` / `QuestionStartPayload` / `CurrentQuestionInfo` に `questionType` フィールド追加
  - `YES_NO_CHOICES` / `YES_NO_QUESTION_COUNT` / `FOUR_CHOICE_QUESTION_COUNT` 定数追加
  - AI プロンプト更新: Claude / Azure OpenAI 両実装で4択と⭕❌を混合生成
  - `AIQuestionSchema` に `questionType` バリデーション追加
  - `QuizAggregate.start()` / `nextQuestion()` で `questionType` をペイロードに含める
  - `ChoiceButton` コンポーネント: ⭕❌用の大きな横並びボタン表示モード追加
  - `QuestionCard` コンポーネント: ⭕❌問題用のアンバー背景 + バッジ表示
  - `QuizView`: 問題形式に応じて4択（縦並び）/ ⭕❌（横並び + 「どっちだ！？」ヘッダ）を切り替え
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
- **AI 項目採用後の非ホスト画面復帰**: ホストが AI 提案を採用した後、非ホスト参加者の「AI がプロフィール項目を考え中...」モーダルが自動で閉じるよう修正。`AI_REQUEST_CANCELLED` をブロードキャストして全員の状態を idle にリセット
- **AI リクエスト人数の即時反映**: `ai-request:started` ペイロードに `totalParticipants` を追加し、リクエスト開始直後から正確な「X/Y 人がリクエスト済み」カウントを表示するよう修正
- **2回目の AI リクエストモーダル再表示**: キャンセル後に再度 AI リクエストを開始した際、`dismissedAIState` がリセットされずモーダルが表示されない問題を修正。`aiRequestState === "idle"` 時に dismiss 状態を自動リセット
- **全員リクエスト送信時の自動 finalize**: 全参加者がリクエストを送信完了すると自動的に AI 生成を開始するよう改善。`executeFinalize` 共通ヘルパーを抽出し、ホスト手動 finalize と自動 finalize の両方で使用
- **ホストの AI リクエストモーダルボタン整理**: ホストは「閉じる」ボタンを非表示にし「AI リクエストをキャンセル」のみ表示。生成中もホストにはキャンセルボタン、非ホストには閉じるボタンを表示
- **AI リクエストの参加者オプトアウト**: 非ホストがモーダルを閉じると `ai-request:dismiss` イベントでサーバに通知し、`totalParticipants` からオプトアウトした参加者を除外。3人中1人が閉じると「X/2人」表示に変化し、残り全員送信完了で自動 finalize が正しく発動するよう修正
- **AI 提案採用時の誤トースト表示**: ホストが「採用する」を押した際に「AI リクエストがキャンセルされました」トーストが表示される問題を修正。`AIRequestCancelledPayload` に `reason` フィールドを追加し、`adopted` 時はトーストを表示しないよう分岐

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
