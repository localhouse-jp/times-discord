import {
  ButtonInteraction,
  TextChannel,
  ChannelType,
  GuildMember,
  MessageFlags
} from 'discord.js';
import { ConfigManager } from '../../config/config-manager';
import { ThreadService } from '../../services/thread-service';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

export async function handleTimesCreate(interaction: ButtonInteraction): Promise<void> {
  const config = ConfigManager.getInstance();
  const threadService = new ThreadService();
  
  let channel: TextChannel | null = null;
  if (config.timesChannelId && interaction.channel?.id !== config.timesChannelId) {
    const fetchedChannel = await interaction.guild!.channels.fetch(config.timesChannelId);
    if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
      channel = fetchedChannel as TextChannel;
    }
  } else {
    channel = interaction.channel as TextChannel;
  }

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ 
      content: ERROR_MESSAGES.INVALID_CHANNEL, 
      flags: MessageFlags.Ephemeral 
    });
    return;
  }

  const member = interaction.member instanceof GuildMember ? interaction.member : null;
  const { thread, existing, error } = await threadService.findOrCreateThread(
    channel,
    interaction.user,
    member
  );
  
  if (existing && thread) {
    await interaction.reply({
      content: `${ERROR_MESSAGES.THREAD_EXISTS} ${thread.toString()}`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  if (!thread || error) {
    await interaction.reply({
      content: error || ERROR_MESSAGES.GENERIC_ERROR,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  await threadService.sendGreeting(thread, interaction.user, config.greetingMessage);
  
  await threadService.notifyTimeline(
    interaction.guild,
    member,
    interaction.user,
    thread
  );
  
  await interaction.reply({
    content: `${SUCCESS_MESSAGES.THREAD_CREATED} ${thread.toString()}`,
    flags: MessageFlags.Ephemeral
  });
}