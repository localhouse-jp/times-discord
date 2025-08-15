import {
  ChatInputCommandInteraction,
  GuildMember,
  MessageFlags
} from 'discord.js';
import { ThreadService } from '../../services/thread-service';
import { CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../../constants';

export async function handleTimesRename(interaction: ChatInputCommandInteraction): Promise<void> {
  const threadService = new ThreadService();
  const newName = interaction.options.getString('name', true);
  
  const safeName = threadService.sanitizeThreadName(newName);
  if (!safeName) {
    await interaction.reply({
      content: ERROR_MESSAGES.VALID_NAME_REQUIRED,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const channel = interaction.channel;
  if (!channel || !channel.isThread()) {
    await interaction.reply({
      content: ERROR_MESSAGES.COMMAND_IN_THREAD,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  if (!threadService.isTimesThread(channel.name)) {
    await interaction.reply({
      content: ERROR_MESSAGES.TIMES_THREAD_ONLY,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const member = interaction.member as GuildMember;
  const isOwner = await threadService.verifyThreadOwnership(
    channel,
    interaction.user.id,
    member,
    interaction.user
  );
  
  if (!isOwner) {
    await interaction.reply({
      content: ERROR_MESSAGES.CANNOT_RENAME_OTHERS,
      flags: MessageFlags.Ephemeral
    });
    return;
  }
  
  const newThreadName = `${CONSTANTS.THREAD_PREFIX}${safeName}`;
  
  try {
    await channel.setName(newThreadName);
    
    await interaction.reply({
      content: `${SUCCESS_MESSAGES.THREAD_RENAMED}「${newThreadName}」に変更しました。`,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    console.error('スレッド名変更エラー:', error);
    await interaction.reply({
      content: ERROR_MESSAGES.RENAME_FAILED,
      flags: MessageFlags.Ephemeral
    });
  }
}