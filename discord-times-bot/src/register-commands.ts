import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

const commands = [
  new SlashCommandBuilder()
    .setName('times_setup')
    .setDescription('times 生成ボタンをこのチャンネル（または指定チャンネル）に設置します')
    .addChannelOption(opt =>
      opt.setName('channel')
        .setDescription('#times チャンネル（未指定なら実行中のチャンネル）')
        .setRequired(false)
    )
    // 管理者ロール相当のみ実行可
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  
  new SlashCommandBuilder()
    .setName('times_config')
    .setDescription('times通知の設定を変更します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('channel')
        .setDescription('通知先チャンネルを設定します')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('通知を送信するチャンネル')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('toggle')
        .setDescription('通知のオン/オフを切り替えます')
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('通知を有効にするか')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('times_channel')
        .setDescription('timesスレッド作成先チャンネルを設定します')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('timesチャンネル（未指定でリセット）')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('greeting')
        .setDescription('挨拶メッセージを設定します')
        .addStringOption(opt =>
          opt.setName('message')
            .setDescription('挨拶メッセージ（{mention}でメンション置換）')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('archive')
        .setDescription('スレッドアーカイブ時間を設定します')
        .addIntegerOption(opt =>
          opt.setName('minutes')
            .setDescription('アーカイブまでの時間（分）')
            .setRequired(true)
            .addChoices(
              { name: '1時間', value: 60 },
              { name: '24時間', value: 1440 },
              { name: '3日', value: 4320 },
              { name: '7日', value: 10080 }
            )
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('現在の設定を表示します')
    )
    // 管理者ロール相当のみ実行可
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

async function main() {
  try {
    // 開発時：ギルドコマンド登録。本番でグローバルにしたい場合は Routes.applicationCommands を使用
    if (process.env.GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID),
        { body: commands }
      );
      console.log('✅ Guild コマンド登録 完了');
    } else {
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID!),
        { body: commands }
      );
      console.log('✅ Global コマンド登録 完了（反映に時間がかかります）');
    }
  } catch (error) {
    console.error('❌ コマンド登録エラー:', error);
    process.exit(1);
  }
}

main();