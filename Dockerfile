# =============================================================
# Dockerfile — wdp-self-intro-quiz
#
# マルチステージビルド:
#   1) shared → client → server をビルド
#   2) 本番用 Node.js イメージで Express + 静的ファイル配信
# =============================================================

# --- Stage 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app

# ワークスペースルートの package files
COPY package.json package-lock.json ./

# 各パッケージの package.json（npm ci の workspace 解決用）
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci --workspaces --include-workspace-root

# ソースコードコピー
COPY tsconfig.base.json ./
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# shared → server, client の順でビルド
RUN npm run build:shared
RUN npm run build:server
# クライアントビルド時に VITE_SERVER_URL は空にして同一オリジンに接続させる
RUN VITE_SERVER_URL="" npm run build:client

# --- Stage 2: Production ---
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# ワークスペースルートの package files
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# 本番依存のみインストール
RUN npm ci --workspaces --include-workspace-root --omit=dev

# ビルド成果物をコピー
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist

EXPOSE 3001

CMD ["node", "packages/server/dist/index.js"]
