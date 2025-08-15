import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  TextChannel,
  ChatInputCommandInteraction,
  ButtonInteraction
} from 'discord.js';
import { buildThreadName, findExistingTimesThread } from './util';

const {
  DISCORD_TOKEN,
  TIMES_CHANNEL_ID,
  GREETING_MESSAGE = '👋 {mention} さん、timesへようこそ！',
  THREAD_ARCHIVE_MINUTES = '10080'
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN が未設定です');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// ボタン行を生成
function buildTimesButtonRow(): ActionRowBuilder<ButtonBuilder> {
  const btn = new ButtonBuilder()
    .setCustomId('times_create')
    .setStyle(ButtonStyle.Primary)
    .setLabel('📌 times を生成する');

  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
}

client.once(Events.ClientReady, (c) => {
  console.log(`🤖 Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /times_setup 実行 → ボタン設置
    if (interaction.isChatInputCommand() && interaction.commandName === 'times_setup') {
      const commandInteraction = interaction as ChatInputCommandInteraction;
      const targetChannel = commandInteraction.options.getChannel('channel') || commandInteraction.channel;

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return commandInteraction.reply({ 
          content: '❌ テキストチャンネルで実行してください。', 
          ephemeral: true 
        });
      }

      // 権限チェック（Bot側）
      const me = await commandInteraction.guild!.members.fetchMe();
      const perms = (targetChannel as TextChannel).permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.CreatePublicThreads)) {
        return commandInteraction.reply({ 
          content: '❌ Botに「メッセージ送信」「公開スレッド作成」権限が必要です。', 
          ephemeral: true 
        });
      }

      await (targetChannel as TextChannel).send({
        content: '各自の個人ログ用スレッド（times）を作成するには、下のボタンを押してください。',
        components: [buildTimesButtonRow()]
      });

      return commandInteraction.reply({ 
        content: `✅ ボタンを <#${targetChannel.id}> に設置しました。`, 
        ephemeral: true 
      });
    }

    // ボタン押下 → スレッド作成
    if (interaction.isButton() && interaction.customId === 'times_create') {
      const buttonInteraction = interaction as ButtonInteraction;
      
      // times 専用チャンネルの制約：指定があれば強制
      let channel: TextChannel | null = null;
      if (TIMES_CHANNEL_ID && buttonInteraction.channel?.id !== TIMES_CHANNEL_ID) {
        const fetchedChannel = await buttonInteraction.guild!.channels.fetch(TIMES_CHANNEL_ID);
        if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
          channel = fetchedChannel as TextChannel;
        }
      } else {
        channel = buttonInteraction.channel as TextChannel;
      }

      if (!channel || channel.type !== ChannelType.GuildText) {
        return buttonInteraction.reply({ 
          content: '❌ #times チャンネルが無効です。管理者へ連絡してください。', 
          ephemeral: true 
        });
      }

      // 既存スレッド探索（重複作成防止）
      const existing = await findExistingTimesThread(channel, buttonInteraction.user.id);
      if (existing) {
        return buttonInteraction.reply({
          content: `ℹ️ すでに times が存在します → ${existing.toString()}`,
          ephemeral: true
        });
      }

      // スレッド名
      const threadName = buildThreadName(buttonInteraction.member || buttonInteraction.user);

      // スレッド作成は「設置メッセージから」開始すると見通しが良い
      // startMessage: ボタンが載っているメッセージID（= interaction.message.id）から開始
      const thread = await channel.threads.create({
        name: threadName,
        startMessage: buttonInteraction.message.id,
        autoArchiveDuration: Number(THREAD_ARCHIVE_MINUTES) as any,
        reason: `times for ${buttonInteraction.user.tag}`
      });

      // 挨拶 + メンション
      const mention = `<@${buttonInteraction.user.id}>`;
      const content = GREETING_MESSAGE.replace('{mention}', mention);
      await thread.send({ content });

      // ユーザーへエフェメラル返信（リンク提示）
      return buttonInteraction.reply({
        content: `✅ あなたの times を作成しました → ${thread.toString()}`,
        ephemeral: true
      });
    }
  } catch (err) {
    console.error(err);
    if ('isRepliable' in interaction && interaction.isRepliable()) {
      try {
        await interaction.reply({ 
          content: '❌ エラーが発生しました。Bot権限・チャンネル設定をご確認ください。', 
          ephemeral: true 
        });
      } catch {}
    }
  }
});

client.login(DISCORD_TOKEN);