# 0003: Claude API の tool_use による構造化出力の強制

## Status

superseded (AI プロバイダーを Azure OpenAI に統一。function calling で同等の構造化出力を実現)

## Context

Claude Sonnet API を使ったクイズ生成で、システムプロンプトで JSON 出力を指示していたが、モデルがマークダウン形式のテキストを返すケースが発生していた。

```
Unexpected token '#', "### waki\n-"... is not valid JSON
```

既存の `extractJson` メソッドはコードフェンス（` ```json ``` `）内の JSON 抽出と生 JSON 文字列の正規表現マッチを行っていたが、モデルがマークダウンヘッダー（`### ...`）を含むテキストを返した場合に JSON パースが失敗し、3 回のリトライを全て消費してクイズ生成が失敗する事象が確認された。

プロンプトのみでは JSON 出力を **保証** できないため、API レベルで構造化出力を強制する手段が必要である。

### 検討した選択肢

1. **Prefilled Assistant Response**: messages に `{ role: "assistant", content: '{"questions": [' }` を追加して JSON 出力を誘導。実装が軽量だが、モデルが途中でテキストに切り替える可能性を完全には排除できない。
2. **Tool Use (Function Calling)**: `tools` パラメータで JSON Schema を定義し、`tool_choice` で使用を強制。スキーマレベルで出力構造を保証でき、レスポンスの `.input` は既にパース済みオブジェクトとして返る。

## Decision

**Anthropic Claude API の tool_use（Function Calling）** を採用する。

### 主な変更点

1. **ツール定義**: `generate_quiz` ツールを定義し、`input_schema` に AIOutput の JSON Schema を指定
2. **`tool_choice`**: `{ type: "tool", name: "generate_quiz" }` でツール使用を強制
3. **JSON Schema の自動生成**: `shared` パッケージの `AIOutputSchema`（Zod）から `zod-to-json-schema` で JSON Schema を自動生成（Single Source of Truth）
4. **レスポンスパース**: `extractText` + `extractJson` を削除し、`extractToolInput` に置換。tool_use ブロックの `.input` を直接取得
5. **Zod バリデーション維持**: tool_use の JSON Schema では文字列長などの細かい制約を十分に表現できないため、Zod による二重バリデーションを維持

### システムプロンプト変更

- `## 出力形式` セクションを削除（ツールスキーマが出力形式を強制するため不要）
- 「結果は generate_quiz ツールを使って返してください」の指示を追加
- ルール・禁止事項セクションは維持

## Consequences

### Positive

- JSON パースエラーが原理的に発生しなくなる（tool_use の `.input` は既にパース済みオブジェクト）
- スキーマ変更時は `shared/src/validation.ts` の Zod 定義のみを修正すれば JSON Schema も自動追従
- プロンプトで出力形式を説明する必要がなくなり、プロンプトがシンプルになる
- `extractText` / `extractJson` の正規表現ベースの脆弱なパースロジックを除去できる

### Negative

- `zod-to-json-schema` への依存が追加される（shared パッケージ）
- Zod スキーマと JSON Schema の二重管理コスト（ただし自動生成で最小化）
- tool_use は通常のテキスト出力より若干トークン消費が多い可能性がある

### Risks

- Claude API の tool_use 仕様変更時の影響（Anthropic SDK のバージョンアップで対応）
