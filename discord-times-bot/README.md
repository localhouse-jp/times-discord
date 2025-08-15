# Discord Times Bot (Bun + Docker版)

## 目的
- #times に「times 生成ボタン」を設置
- ユーザー押下時に当人専用スレッドを作成し、メンション付き挨拶を自動投稿
- 親チャンネルは Admin 以外投稿不可、ただし **スレッド作成/スレッド内投稿は許可** の運用

## 技術スタック
- **Bun.js** - 高速なJavaScript/TypeScriptランタイム
- **TypeScript** - 型安全な開発
- **Discord.js v14** - Discord Bot フレームワーク
- **Docker** - コンテナ化による環境統一

## セットアップ

### 前提条件
- Docker と Docker Compose がインストール済み
- Discord Bot トークンを取得済み
- Bot をサーバーに招待済み（必要な権限付与済み）

### 1. 環境変数の設定
```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下の値を設定：
- `DISCORD_TOKEN`: Bot のトークン
- `CLIENT_ID`: Bot のアプリケーション ID
- `GUILD_ID`: 開発用ギルド ID（本番ではオプション）
- `TIMES_CHANNEL_ID`: #times チャンネル ID（オプション）
- `GREETING_MESSAGE`: 挨拶メッセージテンプレート
- `THREAD_ARCHIVE_MINUTES`: スレッドアーカイブ時間

### 2. Docker イメージのビルド
```bash
docker-compose build
```

### 3. スラッシュコマンドの登録
```bash
docker-compose --profile setup run --rm register-commands
```

### 4. Bot の起動
```bash
docker-compose up -d
```

### 5. ログの確認
```bash
docker-compose logs -f bot
```

### 6. Bot の停止
```bash
docker-compose down
```

## 開発環境での実行

### ローカル開発（Docker なし）
```bash
# Bun のインストール（未インストールの場合）
curl -fsSL https://bun.sh/install | bash

# 依存関係のインストール
bun install

# コマンド登録
bun run register

# Bot 起動
bun run start

# 開発モード（ファイル変更監視）
bun run dev
```

### Docker での開発モード
`docker-compose.yml` でソースコードをマウントしているため、ファイル変更が即座に反映されます：
```bash
docker-compose up
```

## 運用コマンド

### `/times_setup`
実行チャンネル、または `channel` 引数で指定したチャンネルに「times 生成ボタン」を設置します。
（`TIMES_CHANNEL_ID` を .env に設定すると、ボタン押下時のスレッド生成先を固定できます）

## 権限設計（推奨）

### #times（テキストチャンネル）の権限上書き（@everyone に対して）
- **Send Messages（メッセージ送信）**: ❌ Deny
  → 親チャンネルに投稿できるのは Admin/Bot のみ
- **Create Public Threads（公開スレッドの作成）**: ✅ Allow
- **Send Messages in Threads（スレッドでのメッセージ送信）**: ✅ Allow

### Bot（ロール）に必要な権限
- **Send Messages**
- **Create Public Threads**
- **Send Messages in Threads**
- **Manage Threads**（オプション）
- **View Channel**
- **Read Message History**

## 仕様メモ

- **スレッド名**: `times-<display>-<userId>`（重複作成防止のため userId を含む）
- **重複検知**: アクティブ/アーカイブ（公開）スレッドを走査
- **アーカイブ時間**: `.env` の `THREAD_ARCHIVE_MINUTES`（既定 10080 分 = 7 日）
- **挨拶文テンプレート**: `.env` の `GREETING_MESSAGE`（`{mention}` をユーザーに置換）

## Docker 構成

### Dockerfile
- ベースイメージ: `oven/bun:1-alpine`（軽量）
- マルチステージビルド不要（Bun は TypeScript を直接実行）
- 本番環境では最小限の依存関係のみ含む

### docker-compose.yml
- `bot`: メインの Bot サービス
- `register-commands`: コマンド登録用（プロファイル分離）
- 開発時はソースコードをマウント（ホットリロード対応）

## トラブルシューティング

### Bot が起動しない
1. `.env` ファイルの設定を確認
2. Docker ログを確認: `docker-compose logs bot`
3. Discord Developer Portal で Bot のトークンが有効か確認

### コマンドが表示されない
1. コマンド登録を実行: `docker-compose --profile setup run --rm register-commands`
2. ギルドコマンドの場合は即座に反映、グローバルコマンドは最大 1 時間待つ
3. Bot に適切な権限があることを確認

### スレッドが作成されない
1. Bot に `Create Public Threads` 権限があることを確認
2. チャンネルの権限設定を確認
3. `TIMES_CHANNEL_ID` が正しく設定されているか確認

## FAQ

- **Q: 親チャンネルに投稿不可でも、スレッドには投稿できる？**
  A: はい。**Threads 許可**があればユーザーは自分の times に投稿可能です。

- **Q: フォーラムチャンネルでも使える？**
  A: 本実装は通常のテキストチャンネル＋スレッドに最適化しています。フォーラムチャンネル対応は別途実装が必要です。

- **Q: Bun.js を使う利点は？**
  A: 高速な起動時間、TypeScript のネイティブサポート、低メモリ使用量が主な利点です。

## ライセンス
MIT