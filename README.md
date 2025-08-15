<img alt="times-discord" src="./logo.png">
<p align="center">
<h1>Discord Times Bot</h1>
</p>

Discordサーバーに、個人の分報チャンネル（times）を簡単に作成・管理するためのBotです。

## 主な機能

- **timesチャンネル生成ボタン**: 指定チャンネルにボタンを設置し、誰でもワンクリックで自分専用のtimesスレを作成できます。
- **自動挨拶**: スレッド作成時、ユーザーにメンション付きのウェルカムメッセージを自動で投稿します。
- **柔軟な権限管理**: 親チャンネルは管理者のみ投稿可能にしつつ、スレッド内では誰でも自由に発言できる、といった運用が可能です。
- **投稿の転送（Webhook）**: timesスレッド内の投稿を、元のユーザー名とアバターを維持したまま、指定した通知用チャンネルへリアルタイムに転送します。

## 技術スタック

- Bun.js
- TypeScript
- Discord.js v14
- Docker

## 導入方法

### 1. 前提条件

- [Docker](https://www.docker.com/) と Docker Compose (v2) がインストールされていること。
- Discord Botのトークンが取得済みであること。
- **Message Content Intentが有効であること。**
  - [Discord Developer Portal](https://discord.com/developers/applications) にアクセスし、あなたのBotの管理ページを開きます。
  - `Bot` タブに移動します。
  - `Privileged Gateway Intents` セクションにある **`MESSAGE CONTENT INTENT`** を有効にしてください。
  - > ⚠️ **注意**: この設定が無効の場合、Botはメッセージ内容を読み取れず、起動に失敗します。

### 2. 環境変数の設定

`.env.example` をコピーして `.env` ファイルを作成します。

```sh
cp .env.example .env
```

作成した `.env` ファイルを編集し、以下の必須項目を設定してください。

- `DISCORD_TOKEN`: あなたのBotのトークン
- `CLIENT_ID`: あなたのBotのアプリケーションID
- `GUILD_ID`: Botを導入するサーバー（ギルド）のID

> **Note**: 通知チャンネルなどのBotの動作設定は、後述する `/times_config` コマンドですべて行います。

### 3. Botの起動 (Docker)

以下のコマンドを順番に実行します。

```sh
# 1. Dockerイメージをビルドします
docker compose build

# 2. スラッシュコマンドをDiscordに登録します
docker compose --profile setup run --rm register-commands

# 3. Botをバックグラウンドで起動します
docker compose up -d
```

### 4. 動作確認

Botが正常に起動したかログで確認します。

```sh
docker compose logs -f bot
```

### Botの停止

```sh
docker compose down
```

## コマンド一覧

### /times_setup

コマンドを実行したチャンネルに「times 生成ボタン」を設置します。`channel`引数で対象チャンネルを指定することも可能です。

### /times_config (管理者権限)

Botの動作を設定します。

- `/times_config channel <チャンネル>`: 投稿の転送先となる通知チャンネルを設定します。
- `/times_config toggle <true/false>`: 転送機能のON/OFFを切り替えます。
- `/times_config greeting <メッセージ>`: times作成時の挨拶メッセージをカスタマイズします。（`{mention}`でユーザーへのメンションに置換されます）
- `/times_config archive <分数>`: スレッドが自動でアーカイブされるまでの時間を設定します。（60/1440/4320/10080分）
- `/times_config status`: 現在のBot設定一覧を表示します。

## 権限設定（推奨）

Botを最大限に活用するための推奨権限設定です。

### times用チャンネルの権限 (`@everyone`に対して)

- `メッセージを送信`: ❌
- `公開スレッドを作成`: ✅
- `スレッドでメッセージを送信`: ✅

### Botに必要な権限

- `チャンネルを見る`
- `メッセージを送信`
- `スレッドでメッセージを送信`
- `公開スレッドを作成`
- `メッセージ履歴を読む`
- `Webhookの管理` (投稿転送機能に必須)

## ローカル開発 (Dockerなし)

Dockerを使わずにローカル環境で開発する場合の手順です。

```sh
# Bunをインストールします (未導入の場合)
curl -fsSL https://bun.sh/install | bash

# 依存パッケージをインストールします
bun install

# コマンドを登録します
bun run register

# Botを起動します
bun run start

# 開発モード (ファイルの変更を監視して自動で再起動します)
bun run dev
```

## 仕様詳細

- **スレッド名**: `times-<ユーザー表示名>-<ユーザーID>` という形式で作成されます。（ユーザーIDを含めることで重複作成を防止）
- **設定の永続化**: Botの設定は `bot-config.json` ファイルに保存されます。
- **通知機能**: DiscordのWebhook機能を利用して、元のユーザー名とアバターで投稿を転送します。

## トラブルシューティング

- **Botが起動しない**:
  - `.env`ファイルの設定が正しいか確認してください。
  - `docker compose logs bot`でエラー内容を確認してください。特に`MESSAGE CONTENT INTENT`に関するエラーが出ていないか確認しましょう。
- **コマンドが表示されない**:
  - `docker compose --profile setup run --rm register-commands` を実行したか確認してください。
  - グローバルコマンドはDiscordに反映されるまで最大1時間かかることがあります。
- **通知が機能しない**:
  - Botに `Webhookの管理` 権限が付与されているか確認してください。
  - `/times_config status` で通知機能が有効になっているか確認してください。

## FAQ

- **Q: 親チャンネルに投稿できなくても、スレッドには投稿できますか？**
  - A: はい。チャンネルの権限で「スレッドでメッセージを送信」が許可されていれば投稿可能です。
- **Q: Bun.jsを使うメリットは何ですか？**
  - A: 起動が非常に速く、TypeScriptを直接実行できるため、開発体験が向上します。

## ライセンス

MIT
