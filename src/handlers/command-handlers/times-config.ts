import {
  ChatInputCommandInteraction,
  ChannelType,
  MessageFlags
} from 'discord.js';
import { ConfigManager } from '../../config/config-manager';
import { SUBCOMMANDS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';

export async function handleTimesConfig(interaction: ChatInputCommandInteraction): Promise<void> {
  const config = ConfigManager.getInstance();
  const subcommand = interaction.options.getSubcommand();
  
  switch (subcommand) {
    case SUBCOMMANDS.CHANNEL:
      await handleChannelConfig(interaction, config);
      break;
    case SUBCOMMANDS.TOGGLE:
      await handleToggleConfig(interaction, config);
      break;
    case SUBCOMMANDS.STATUS:
      await handleStatusConfig(interaction, config);
      break;
    case SUBCOMMANDS.TIMES_CHANNEL:
      await handleTimesChannelConfig(interaction, config);
      break;
    case SUBCOMMANDS.GREETING:
      await handleGreetingConfig(interaction, config);
      break;
    case SUBCOMMANDS.ARCHIVE:
      await handleArchiveConfig(interaction, config);
      break;
  }
}

async function handleChannelConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  
  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: ERROR_MESSAGES.TEXT_CHANNEL_REQUIRED,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  config.updateConfig({ notificationChannelId: channel.id });
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.NOTIFICATION_SET} <#${channel.id}> に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleToggleConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const enabled = interaction.options.getBoolean('enabled', true);
  config.updateConfig({ notificationEnabled: enabled });
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.NOTIFICATION_TOGGLED}${enabled ? '有効' : '無効'}にしました。`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleStatusConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const currentConfig = config.getConfig();
  const status = [
    '📊 **現在の設定**',
    `通知: ${currentConfig.notificationEnabled ? '✅ 有効' : '❌ 無効'}`,
    `通知チャンネル: ${currentConfig.notificationChannelId ? `<#${currentConfig.notificationChannelId}>` : '親チャンネル（デフォルト）'}`,
    `Timesチャンネル: ${currentConfig.timesChannelId ? `<#${currentConfig.timesChannelId}>` : '未設定（ボタン設置チャンネル）'}`,
    `挨拶メッセージ: ${currentConfig.greetingMessage}`,
    `スレッドアーカイブ: ${currentConfig.threadArchiveMinutes}分`
  ];
  
  await interaction.reply({
    content: status.join('\n'),
    flags: MessageFlags.Ephemeral
  });
}

async function handleTimesChannelConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const channel = interaction.options.getChannel('channel');
  
  if (channel) {
    if (channel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: ERROR_MESSAGES.TEXT_CHANNEL_REQUIRED,
        flags: MessageFlags.Ephemeral
      });
      return;
    }
    config.updateConfig({ timesChannelId: channel.id });
  } else {
    config.updateConfig({ timesChannelId: undefined });
  }
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.TIMES_CHANNEL_SET} ${channel ? `<#${channel.id}>` : 'デフォルト（ボタン設置チャンネル）'} に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleGreetingConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const message = interaction.options.getString('message', true);
  config.updateConfig({ greetingMessage: message });
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.GREETING_SET}\n> ${message}`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleArchiveConfig(
  interaction: ChatInputCommandInteraction,
  config: ConfigManager
): Promise<void> {
  const minutes = interaction.options.getInteger('minutes', true);
  config.updateConfig({ threadArchiveMinutes: minutes });
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.ARCHIVE_SET} ${minutes}分 に設定しました。`,
    flags: MessageFlags.Ephemeral
  });
}