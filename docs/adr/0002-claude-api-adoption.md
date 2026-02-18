# 0002: AI プロバイダーを OpenAI から Anthropic Claude に変更

## Status

accepted

## Context

MVP の AI クイズ生成に使用する LLM プロバイダーを選定する必要がある。

初期設計では OpenAI GPT-4o-mini を想定していたが、以下の観点から再検討した:

- **クイズ生成品質**: 自己紹介情報から創造的で面白い4択クイズを生成する能力が重要
- **日本語品質**: 自然な日本語での問題文・解説文が必要
- **JSON 出力安定性**: 構造化された JSON 出力を確実に返す能力
- **コスト**: MVP では 1 ルームあたり 1 回の API 呼び出し（10問生成）。高頻度ではない

## Decision

**Anthropic Claude API (Sonnet 4.5)** を採用する。

主な変更点:

1. **SDK**: `openai` → `@anthropic-ai/sdk`
2. **モデル**: `gpt-4o-mini` → `claude-sonnet-4-5-20241022`
3. **API 形式**: Chat Completions API → Messages API
4. **JSON モード**: `response_format: { type: "json_object" }` → システムプロンプトで JSON 出力を指示 + レスポンスからパース
5. **環境変数**: `OPENAI_API_KEY` → `ANTHROPIC_API_KEY`
6. **Infrastructure**: `OpenAIQuizGenerator` → `ClaudeQuizGenerator`

## Consequences

### Positive

- Sonnet 4.5 は日本語の自然さ・創造性において高品質
- プロンプトインジェクション耐性が高い（参加者入力をデータとして安全に扱える）
- Ports & Adapters パターンにより、`QuizGenerator` Port の実装差し替えのみで対応完了

### Negative

- Claude API には `response_format` がないため、JSON パースの堅牢性をプロンプト + バリデーションで担保する必要がある
- Anthropic SDK のエラー型が OpenAI SDK と異なるため、リトライロジックの調整が必要

### Risks

- Claude API のレート制限に注意（同時多数ルームの生成時）→ MVP の 20 人規模では問題なし
