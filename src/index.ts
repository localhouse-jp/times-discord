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
  ButtonInteraction,
  WebhookClient,
  Message,
  MessageFlags,
  GuildMember
} from 'discord.js';
import { buildThreadName, findExistingTimesThread, getDisplayNameForNotification } from './util';
import fs from 'fs';
import path from 'path';

const { DISCORD_TOKEN } = process.env;

// Configuration storage
interface BotConfig {
  notificationChannelId?: string;
  notificationEnabled: boolean;
  timesChannelId?: string;
  greetingMessage: string;
  threadArchiveMinutes: number;
}

const CONFIG_FILE = 'bot-config.json';
let config: BotConfig = {
  notificationEnabled: true,
  greetingMessage: '👋 {mention} さん、timesへようこそ！',
  threadArchiveMinutes: 10080
};

// Load configuration from file if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    config = { ...config, ...JSON.parse(data) };
  } catch (err) {
    console.error('設定ファイル読み込みエラー:', err);
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('設定ファイル保存エラー:', err);
  }
}

if (!DISCORD_TOKEN) {
  console.error('❌ DISCORD_TOKEN が未設定です');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent  // Required for reading message content in threads (privileged intent - must be enabled in Discord Developer Portal)
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

// Helper function to get or create webhook for a channel
async function getOrCreateWebhook(channel: TextChannel): Promise<string | null> {
  try {
    // Check if bot has MANAGE_WEBHOOKS permission
    const me = channel.guild.members.me;
    if (!me) return null;
    
    const permissions = channel.permissionsFor(me);
    if (!permissions?.has(PermissionFlagsBits.ManageWebhooks)) {
      console.error('Bot lacks MANAGE_WEBHOOKS permission in channel:', channel.name);
      return null;
    }
    
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find(wh => wh.name === 'Times Notification Bot');
    
    if (!webhook) {
      webhook = await channel.createWebhook({
        name: 'Times Notification Bot',
        reason: 'For forwarding times thread messages'
      });
    }
    
    return webhook.url;
  } catch (err) {
    console.error('Webhook作成エラー:', err);
    return null;
  }
}

// Store webhook messages to track edits
const webhookMessages = new Map<string, { webhookId: string; webhookToken: string; messageId: string }>();

client.on(Events.MessageCreate, async (message: Message) => {
  try {
    // 通知が無効な場合はスキップ
    if (!config.notificationEnabled) return;
    
    // Botのメッセージは無視
    if (message.author.bot) return;
    
    // スレッド内のメッセージかチェック
    if (!message.channel.isThread()) return;
    
    // timesスレッドかチェック（名前に "times-" が含まれているか）
    const thread = message.channel;
    if (!thread.name.startsWith('times-')) return;
    
    // 通知チャンネルを決定
    let notificationChannel: TextChannel | null = null;
    
    if (config.notificationChannelId) {
      const fetchedChannel = await message.guild?.channels.fetch(config.notificationChannelId);
      if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
        notificationChannel = fetchedChannel as TextChannel;
      }
    }
    
    // 通知チャンネルが設定されていない場合は親チャンネルを使用
    if (!notificationChannel) {
      const parentChannel = thread.parent;
      if (parentChannel && parentChannel.type === ChannelType.GuildText) {
        notificationChannel = parentChannel as TextChannel;
      }
    }
    
    if (!notificationChannel) return;
    
    // Webhookを取得または作成
    const webhookUrl = await getOrCreateWebhook(notificationChannel);
    if (!webhookUrl) return;
    
    // Webhookクライアントを作成
    const webhookClient = new WebhookClient({ url: webhookUrl });
    
    // Get member to access nickname (fetch if not cached)
    let member = null;
    try {
      member = message.member || await message.guild?.members.fetch(message.author.id).catch(() => null);
    } catch {}
    const displayName = getDisplayNameForNotification(member || null, message.author);
    
    // スレッドへのリンクを追加
    const threadLink = `\n[スレッドで見る](${thread.url})`;
    const contentWithLink = message.content ? `${message.content}${threadLink}` : threadLink;
    
    // メッセージを転送（ユーザーの名前とアバターを保持）
    const webhookMessage = await webhookClient.send({
      content: contentWithLink,
      username: `${displayName} (times)`,
      avatarURL: message.author.displayAvatarURL(),
      embeds: message.embeds,
      files: message.attachments.map(a => a.url),
      allowedMentions: { parse: [] } // メンションを無効化
    });
    
    // Parse webhook URL to get ID and token
    const urlParts = webhookUrl.match(/webhooks\/(\d+)\/([^/]+)/);
    if (urlParts && webhookMessage) {
      webhookMessages.set(message.id, {
        webhookId: urlParts[1],
        webhookToken: urlParts[2],
        messageId: webhookMessage.id
      });
    }
    
    webhookClient.destroy();
  } catch (err) {
    console.error('❌ times通知エラー:', err);
  }
});

// Handle message edits
client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  try {
    // 通知が無効な場合はスキップ
    if (!config.notificationEnabled) return;
    
    // Partial messages need to be fetched
    if (newMessage.partial) {
      try {
        await newMessage.fetch();
      } catch (error) {
        console.error('Failed to fetch message:', error);
        return;
      }
    }
    
    // Botのメッセージは無視
    if (newMessage.author?.bot) return;
    
    // スレッド内のメッセージかチェック
    if (!newMessage.channel.isThread()) return;
    
    // timesスレッドかチェック
    const thread = newMessage.channel;
    if (!thread.name.startsWith('times-')) return;
    
    // Check if we have a webhook message to edit
    const webhookInfo = webhookMessages.get(newMessage.id);
    if (!webhookInfo) return;
    
    // Create webhook client with ID and token
    const webhookClient = new WebhookClient({
      id: webhookInfo.webhookId,
      token: webhookInfo.webhookToken
    });
    
    // Get member to access nickname (fetch if not cached)
    let member = null;
    try {
      member = newMessage.member || await newMessage.guild?.members.fetch(newMessage.author!.id).catch(() => null);
    } catch {}
    const displayName = getDisplayNameForNotification(member || null, newMessage.author!);
    
    // Edit the webhook message
    await webhookClient.editMessage(webhookInfo.messageId, {
      content: newMessage.content || undefined,
      embeds: newMessage.embeds,
      files: newMessage.attachments.map(a => a.url),
      allowedMentions: { parse: [] }
    });
    
    webhookClient.destroy();
  } catch (err) {
    console.error('❌ times編集通知エラー:', err);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /times_config コマンド - 通知設定
    if (interaction.isChatInputCommand() && interaction.commandName === 'times_config') {
      const commandInteraction = interaction as ChatInputCommandInteraction;
      const subcommand = commandInteraction.options.getSubcommand();
      
      if (subcommand === 'channel') {
        const channel = commandInteraction.options.getChannel('channel', true);
        
        if (channel.type !== ChannelType.GuildText) {
          return commandInteraction.reply({
            content: '❌ テキストチャンネルを指定してください。',
            flags: MessageFlags.Ephemeral
          });
        }
        
        config.notificationChannelId = channel.id;
        saveConfig();
        
        return commandInteraction.reply({
          content: `✅ 通知チャンネルを <#${channel.id}> に設定しました。`,
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (subcommand === 'toggle') {
        const enabled = commandInteraction.options.getBoolean('enabled', true);
        config.notificationEnabled = enabled;
        saveConfig();
        
        return commandInteraction.reply({
          content: `✅ 通知を${enabled ? '有効' : '無効'}にしました。`,
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (subcommand === 'status') {
        const status = [
          '📊 **現在の設定**',
          `通知: ${config.notificationEnabled ? '✅ 有効' : '❌ 無効'}`,
          `通知チャンネル: ${config.notificationChannelId ? `<#${config.notificationChannelId}>` : '親チャンネル（デフォルト）'}`,
          `Timesチャンネル: ${config.timesChannelId ? `<#${config.timesChannelId}>` : '未設定（ボタン設置チャンネル）'}`,
          `挨拶メッセージ: ${config.greetingMessage}`,
          `スレッドアーカイブ: ${config.threadArchiveMinutes}分`
        ];
        
        return commandInteraction.reply({
          content: status.join('\n'),
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (subcommand === 'times_channel') {
        const channel = commandInteraction.options.getChannel('channel');
        
        if (channel) {
          if (channel.type !== ChannelType.GuildText) {
            return commandInteraction.reply({
              content: '❌ テキストチャンネルを指定してください。',
              flags: MessageFlags.Ephemeral
            });
          }
          config.timesChannelId = channel.id;
        } else {
          config.timesChannelId = undefined;
        }
        
        saveConfig();
        
        return commandInteraction.reply({
          content: `✅ Timesチャンネルを ${channel ? `<#${channel.id}>` : 'デフォルト（ボタン設置チャンネル）'} に設定しました。`,
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (subcommand === 'greeting') {
        const message = commandInteraction.options.getString('message', true);
        config.greetingMessage = message;
        saveConfig();
        
        return commandInteraction.reply({
          content: `✅ 挨拶メッセージを設定しました:\n> ${message}`,
          flags: MessageFlags.Ephemeral
        });
      }
      
      if (subcommand === 'archive') {
        const minutes = commandInteraction.options.getInteger('minutes', true);
        config.threadArchiveMinutes = minutes;
        saveConfig();
        
        return commandInteraction.reply({
          content: `✅ スレッドアーカイブ時間を ${minutes}分 に設定しました。`,
          flags: MessageFlags.Ephemeral
        });
      }
    }
    
    // /times_rename コマンド - スレッド名変更
    if (interaction.isChatInputCommand() && interaction.commandName === 'times_rename') {
      const commandInteraction = interaction as ChatInputCommandInteraction;
      const newName = commandInteraction.options.getString('name', true);
      
      // サニタイゼーション（不正な文字を削除）
      const safeName = newName.replace(/[^\w\-ぁ-んァ-ヴー一-龠]/g, '').slice(0, 90);
      if (!safeName) {
        return commandInteraction.reply({
          content: '❌ 有効な名前を入力してください。',
          flags: MessageFlags.Ephemeral
        });
      }
      
      // 現在のチャンネルを取得
      const channel = commandInteraction.channel;
      if (!channel || !channel.isThread()) {
        return commandInteraction.reply({
          content: '❌ このコマンドはtimesスレッド内で実行してください。',
          flags: MessageFlags.Ephemeral
        });
      }
      
      // timesスレッドかチェック
      if (!channel.name.startsWith('times-')) {
        return commandInteraction.reply({
          content: '❌ このコマンドはtimesスレッド内でのみ使用できます。',
          flags: MessageFlags.Ephemeral
        });
      }
      
      // スレッドの所有者チェック
      // スレッド名から現在のユーザー情報を取得して比較
      const member = commandInteraction.member as GuildMember;
      const expectedThreadName = buildThreadName(member || commandInteraction.user);
      const userIdInName = commandInteraction.user.id;
      
      // スレッド名に自分のIDまたは期待される名前が含まれているかチェック
      if (!channel.name.includes(userIdInName) && channel.name !== expectedThreadName) {
        // より詳細な所有者チェック：スレッドの作成者を確認
        try {
          // スレッドのメッセージ履歴から最初のメッセージを取得
          const starterMessage = await channel.fetchStarterMessage().catch(() => null);
          const firstMessages = await channel.messages.fetch({ limit: 1, after: '0' });
          const firstMessage = firstMessages.first();
          
          // ボットが最初に送った挨拶メッセージに含まれるメンションを確認
          if (firstMessage && firstMessage.author.bot) {
            const mentionMatch = firstMessage.content.match(/<@(\d+)>/);
            if (mentionMatch && mentionMatch[1] !== commandInteraction.user.id) {
              return commandInteraction.reply({
                content: '❌ 他の人のtimesスレッドの名前は変更できません。',
                flags: MessageFlags.Ephemeral
              });
            }
          } else if (!channel.name.includes(commandInteraction.user.username)) {
            return commandInteraction.reply({
              content: '❌ 他の人のtimesスレッドの名前は変更できません。',
              flags: MessageFlags.Ephemeral
            });
          }
        } catch (error) {
          console.error('スレッド所有者の確認エラー:', error);
        }
      }
      
      // 新しいスレッド名を作成
      const newThreadName = `times-${safeName}`;
      
      try {
        // スレッド名を変更
        await channel.setName(newThreadName);
        
        return commandInteraction.reply({
          content: `✅ スレッド名を「${newThreadName}」に変更しました。`,
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        console.error('スレッド名変更エラー:', error);
        return commandInteraction.reply({
          content: '❌ スレッド名の変更に失敗しました。権限を確認してください。',
          flags: MessageFlags.Ephemeral
        });
      }
    }
    
    // /times_setup 実行 → ボタン設置
    if (interaction.isChatInputCommand() && interaction.commandName === 'times_setup') {
      const commandInteraction = interaction as ChatInputCommandInteraction;
      const targetChannel = commandInteraction.options.getChannel('channel') || commandInteraction.channel;

      if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
        return commandInteraction.reply({ 
          content: '❌ テキストチャンネルで実行してください。', 
          flags: MessageFlags.Ephemeral 
        });
      }

      // 権限チェック（Bot側）
      const me = await commandInteraction.guild!.members.fetchMe();
      const perms = (targetChannel as TextChannel).permissionsFor(me);
      if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.CreatePublicThreads)) {
        return commandInteraction.reply({ 
          content: '❌ Botに「メッセージ送信」「公開スレッド作成」権限が必要です。', 
          flags: MessageFlags.Ephemeral 
        });
      }

      await (targetChannel as TextChannel).send({
        content: '各自の個人ログ用スレッド（times）を作成するには、下のボタンを押してください。',
        components: [buildTimesButtonRow()]
      });

      return commandInteraction.reply({ 
        content: `✅ ボタンを <#${targetChannel.id}> に設置しました。`, 
        flags: MessageFlags.Ephemeral 
      });
    }

    // ボタン押下 → スレッド作成
    if (interaction.isButton() && interaction.customId === 'times_create') {
      const buttonInteraction = interaction as ButtonInteraction;
      
      // times 専用チャンネルの制約：指定があれば強制
      let channel: TextChannel | null = null;
      if (config.timesChannelId && buttonInteraction.channel?.id !== config.timesChannelId) {
        const fetchedChannel = await buttonInteraction.guild!.channels.fetch(config.timesChannelId);
        if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
          channel = fetchedChannel as TextChannel;
        }
      } else {
        channel = buttonInteraction.channel as TextChannel;
      }

      if (!channel || channel.type !== ChannelType.GuildText) {
        return buttonInteraction.reply({ 
          content: '❌ #times チャンネルが無効です。管理者へ連絡してください。', 
          flags: MessageFlags.Ephemeral 
        });
      }

      // 既存スレッド探索（重複作成防止）
      const existing = await findExistingTimesThread(
        channel, 
        buttonInteraction.user.id,
        buttonInteraction.member as GuildMember || buttonInteraction.user
      );
      if (existing) {
        return buttonInteraction.reply({
          content: `ℹ️ すでに times が存在します → ${existing.toString()}`,
          flags: MessageFlags.Ephemeral
        });
      }

      // スレッド名
      const member = buttonInteraction.member instanceof GuildMember ? buttonInteraction.member : null;
      const threadName = buildThreadName(member || buttonInteraction.user);

      // スレッド作成（startMessageを使わずに独立したスレッドとして作成）
      const thread = await channel.threads.create({
        name: threadName,
        autoArchiveDuration: config.threadArchiveMinutes as any,
        reason: `times for ${buttonInteraction.user.tag}`,
        invitable: false  // システムメッセージを抑制
      });

      // 挨拶 + メンション + rename案内
      const mention = `<@${buttonInteraction.user.id}>`;
      const greetingContent = config.greetingMessage.replace('{mention}', mention);
      const renameInfo = '\n\n💡 **Tip**: `/times_rename` コマンドでスレッド名を変更できます。';
      const content = greetingContent + renameInfo;
      await thread.send({ content });

      // times-timeline チャンネルへの通知
      try {
        // times-timeline チャンネルを探す
        const guild = buttonInteraction.guild;
        if (guild) {
          const timelineChannel = guild.channels.cache.find(
            ch => ch.name === 'times-timeline' && ch.type === ChannelType.GuildText
          ) as TextChannel | undefined;
          
          if (timelineChannel) {
            // メンバー情報を取得して表示名を使用
            const displayName = member ? (member.nickname || member.displayName || buttonInteraction.user.username) : buttonInteraction.user.username;
            await timelineChannel.send({
              content: `🎉 **${displayName}** さんがtimesスレッドを作成しました！ → ${thread.toString()}`
            });
          }
        }
      } catch (err) {
        console.error('times-timeline通知エラー:', err);
      }

      // ユーザーへエフェメラル返信（リンク提示）
      return buttonInteraction.reply({
        content: `✅ あなたの times を作成しました → ${thread.toString()}`,
        flags: MessageFlags.Ephemeral
      });
    }
  } catch (err) {
    console.error(err);
    if ('isRepliable' in interaction && interaction.isRepliable()) {
      try {
        await interaction.reply({ 
          content: '❌ エラーが発生しました。Bot権限・チャンネル設定をご確認ください。', 
          flags: MessageFlags.Ephemeral 
        });
      } catch {}
    }
  }
});

client.login(DISCORD_TOKEN);
