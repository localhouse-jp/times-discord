import {
  ChatInputCommandInteraction,
  TextChannel,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { CONSTANTS, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../../constants';

export async function handleTimesSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    await interaction.reply({ 
      content: ERROR_MESSAGES.TEXT_CHANNEL_REQUIRED, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const me = await interaction.guild!.members.fetchMe();
  const perms = (targetChannel as TextChannel).permissionsFor(me);
  
  if (!perms?.has(PermissionFlagsBits.SendMessages) || !perms?.has(PermissionFlagsBits.CreatePublicThreads)) {
    await interaction.reply({ 
      content: ERROR_MESSAGES.PERMISSIONS_REQUIRED, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const buttonRow = buildTimesButtonRow();
  
  await (targetChannel as TextChannel).send({
    content: '各自の個人ログ用スレッド（times）を作成するには、下のボタンを押してください。',
    components: [buttonRow]
  });

  await interaction.reply({ 
    content: `${SUCCESS_MESSAGES.BUTTON_PLACED} <#${targetChannel.id}> に設置しました。`, 
    flags: MessageFlags.Ephemeral 
  });
}

function buildTimesButtonRow(): ActionRowBuilder<ButtonBuilder> {
  const btn = new ButtonBuilder()
    .setCustomId(CONSTANTS.BUTTON_ID)
    .setStyle(ButtonStyle.Primary)
    .setLabel('📌 times を生成する');

  return new ActionRowBuilder<ButtonBuilder>().addComponents(btn);
}