# Bunの公式イメージを使用
FROM oven/bun:1-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとlockfileをコピー（キャッシュ効率化）
COPY package.json bun.lockb* ./

# 依存関係をインストール
RUN bun install --frozen-lockfile

# アプリケーションのソースコードをコピー
COPY src ./src
COPY tsconfig.json ./

# 環境変数ファイルのプレースホルダー（実行時にマウントまたはENVで設定）
# COPY .env ./ は実行時に docker-compose または -v でマウント推奨

# Bunでアプリケーションを起動
CMD ["bun", "run", "start"]