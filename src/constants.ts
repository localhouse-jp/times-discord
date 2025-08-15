export const CONSTANTS = {
  THREAD_PREFIX: 'times-',
  TIMELINE_CHANNEL: 'times-timeline',
  WEBHOOK_NAME: 'Times Notification Bot',
  BUTTON_ID: 'times_create',
  CONFIG_FILE: 'bot-config.json',
  MAX_THREAD_NAME_LENGTH: 90,
  DEFAULT_ARCHIVE_MINUTES: 10080,
  DEFAULT_GREETING: '👋 {mention} さん、timesへようこそ！',
  RENAME_TIP: '\n\n💡 **Tip**: `/times_rename` コマンドでスレッド名を変更できます。'
} as const;

export const COMMANDS = {
  TIMES_SETUP: 'times_setup',
  TIMES_CONFIG: 'times_config',
  TIMES_RENAME: 'times_rename'
} as const;

export const SUBCOMMANDS = {
  CHANNEL: 'channel',
  TOGGLE: 'toggle',
  STATUS: 'status',
  TIMES_CHANNEL: 'times_channel',
  GREETING: 'greeting',
  ARCHIVE: 'archive'
} as const;

export const ERROR_MESSAGES = {
  NO_TOKEN: '❌ DISCORD_TOKEN が未設定です',
  TEXT_CHANNEL_REQUIRED: '❌ テキストチャンネルを指定してください。',
  INVALID_CHANNEL: '❌ #times チャンネルが無効です。管理者へ連絡してください。',
  THREAD_EXISTS: 'ℹ️ すでに times が存在します →',
  PERMISSIONS_REQUIRED: '❌ Botに「メッセージ送信」「公開スレッド作成」権限が必要です。',
  VALID_NAME_REQUIRED: '❌ 有効な名前を入力してください。',
  COMMAND_IN_THREAD: '❌ このコマンドはtimesスレッド内で実行してください。',
  TIMES_THREAD_ONLY: '❌ このコマンドはtimesスレッド内でのみ使用できます。',
  CANNOT_RENAME_OTHERS: '❌ 他の人のtimesスレッドの名前は変更できません。',
  RENAME_FAILED: '❌ スレッド名の変更に失敗しました。権限を確認してください。',
  GENERIC_ERROR: '❌ エラーが発生しました。Bot権限・チャンネル設定をご確認ください。'
} as const;

export const SUCCESS_MESSAGES = {
  BUTTON_PLACED: '✅ ボタンを',
  NOTIFICATION_SET: '✅ 通知チャンネルを',
  NOTIFICATION_TOGGLED: '✅ 通知を',
  TIMES_CHANNEL_SET: '✅ Timesチャンネルを',
  GREETING_SET: '✅ 挨拶メッセージを設定しました:',
  ARCHIVE_SET: '✅ スレッドアーカイブ時間を',
  THREAD_RENAMED: '✅ スレッド名を',
  THREAD_CREATED: '✅ あなたの times を作成しました →'
} as const;