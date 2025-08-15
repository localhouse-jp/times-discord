import {
  Interaction,
  ChatInputCommandInteraction,
  ButtonInteraction,
  MessageFlags
} from 'discord.js';
import { COMMANDS, CONSTANTS, ERROR_MESSAGES } from '../../constants';
import { handleTimesSetup, handleTimesConfig, handleTimesRename } from '../command-handlers';
import { handleTimesCreate } from '../button-handlers/times-create';

export class InteractionCreateHandler {
  async handle(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      }
    } catch (err) {
      console.error(err);
      await this.sendErrorReply(interaction);
    }
  }

  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    switch (interaction.commandName) {
      case COMMANDS.TIMES_SETUP:
        await handleTimesSetup(interaction);
        break;
      case COMMANDS.TIMES_CONFIG:
        await handleTimesConfig(interaction);
        break;
      case COMMANDS.TIMES_RENAME:
        await handleTimesRename(interaction);
        break;
    }
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    if (interaction.customId === CONSTANTS.BUTTON_ID) {
      await handleTimesCreate(interaction);
    }
  }

  private async sendErrorReply(interaction: Interaction): Promise<void> {
    if ('isRepliable' in interaction && interaction.isRepliable()) {
      try {
        await interaction.reply({ 
          content: ERROR_MESSAGES.GENERIC_ERROR, 
          flags: MessageFlags.Ephemeral 
        });
      } catch {}
    }
  }
}