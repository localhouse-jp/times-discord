# Discord Times Bot (Bun + Docker版)

## 目的
- #times に「times 生成ボタン」を設置
- ユーザー押下時に当人専用スレッドを作成し、メンション付き挨拶を自動投稿
- 親チャンネルは Admin 以外投稿不可、ただし **スレッド作成/スレッド内投稿は許可** の運用
- **timesスレッドに投稿があった際、元のユーザー名とアバターで指定チャンネルに転送**

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
- **重要**: Discord Developer Portal で MESSAGE CONTENT INTENT を有効化済み（下記参照）

### 1. Discord Developer Portal での設定（重要）

**MESSAGE CONTENT INTENT の有効化が必須です:**

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. あなたの Bot アプリケーションを選択
3. 左メニューから「Bot」セクションを選択
4. 「Privileged Gateway Intents」セクションまでスクロール
5. **「MESSAGE CONTENT INTENT」をオンにする**
6. 設定を保存

> ⚠️ **注意**: MESSAGE CONTENT INTENT が無効の場合、Bot は「Used disallowed intents」エラーで起動に失敗します。このインテントは、Bot がtimesスレッド内のメッセージを読み取り、通知チャンネルに転送するために必要です。

### 2. 環境変数の設定
```bash
cp .env.example .env
```

`.env` ファイルを編集して、以下の値を設定：
- `DISCORD_TOKEN`: Bot のトークン（必須）
- `CLIENT_ID`: Bot のアプリケーション ID（必須）
- `GUILD_ID`: 開発用ギルド ID（本番ではオプション）

**注意**: その他の設定（通知チャンネル、挨拶メッセージ等）はすべて `/times_config` コマンドで設定します。

### 3. Docker イメージのビルド
```bash
docker-compose build
```

### 4. スラッシュコマンドの登録
```bash
docker-compose --profile setup run --rm register-commands
```

### 5. Bot の起動
```bash
docker-compose up -d
```

### 6. ログの確認
```bash
docker-compose logs -f bot
```

### 7. Bot の停止
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

### `/times_config`
Bot の動作設定を変更します（管理者権限が必要）：

- `/times_config channel <チャンネル>` - 通知先チャンネルを設定
- `/times_config toggle <true/false>` - 通知のオン/オフを切り替え
- `/times_config times_channel <チャンネル>` - timesスレッド作成先を固定（未指定でリセット）
- `/times_config greeting <メッセージ>` - 挨拶メッセージを設定（`{mention}`でメンション置換）
- `/times_config archive <分数>` - スレッドアーカイブ時間を設定（60/1440/4320/10080分から選択）
- `/times_config status` - 現在の設定を表示

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
- **Manage Webhooks**（通知機能に必須）
- **Manage Threads**（オプション）
- **View Channel**
- **Read Message History**

## 仕様メモ

- **スレッド名**: `times-<display>-<userId>`（重複作成防止のため userId を含む）
- **重複検知**: アクティブ/アーカイブ（公開）スレッドを走査
- **設定保存**: `bot-config.json` ファイルに保存（環境変数不要）
- **通知機能**: Webhook を使用して元のユーザー名とアバターで転送
- **デフォルト値**:
  - 挨拶メッセージ: `👋 {mention} さん、timesへようこそ！`
  - アーカイブ時間: 10080分（7日）
  - 通知: 有効

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
4. **MESSAGE CONTENT INTENT が有効になっているか確認**（「Used disallowed intents」エラーの場合）

### コマンドが表示されない
1. コマンド登録を実行: `docker-compose --profile setup run --rm register-commands`
2. ギルドコマンドの場合は即座に反映、グローバルコマンドは最大 1 時間待つ
3. Bot に適切な権限があることを確認

### スレッドが作成されない
1. Bot に `Create Public Threads` 権限があることを確認
2. チャンネルの権限設定を確認
3. `TIMES_CHANNEL_ID` が正しく設定されているか確認

### 通知が機能しない
1. Bot に `Manage Webhooks` 権限があることを確認
2. 通知先チャンネルで Bot が Webhook を作成できることを確認
3. `/times_config status` で通知が有効になっているか確認

## FAQ

- **Q: 親チャンネルに投稿不可でも、スレッドには投稿できる？**
  A: はい。**Threads 許可**があればユーザーは自分の times に投稿可能です。

- **Q: フォーラムチャンネルでも使える？**
  A: 本実装は通常のテキストチャンネル＋スレッドに最適化しています。フォーラムチャンネル対応は別途実装が必要です。

- **Q: Bun.js を使う利点は？**
  A: 高速な起動時間、TypeScript のネイティブサポート、低メモリ使用量が主な利点です。

## ライセンス
MIT