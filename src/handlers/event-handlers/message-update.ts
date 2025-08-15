import {
  Message,
  PartialMessage
} from 'discord.js';
import { ConfigManager } from '../../config/config-manager';
import { WebhookService } from '../../services/webhook-service';
import { ThreadService } from '../../services/thread-service';

export class MessageUpdateHandler {
  private webhookService: WebhookService;
  private threadService: ThreadService;
  private config: ConfigManager;

  constructor(webhookService: WebhookService) {
    this.webhookService = webhookService;
    this.threadService = new ThreadService();
    this.config = ConfigManager.getInstance();
  }

  async handle(oldMessage: Message | PartialMessage, newMessage: Message | PartialMessage): Promise<void> {
    try {
      if (!this.config.notificationEnabled) return;
      
      if (newMessage.partial) {
        try {
          await newMessage.fetch();
        } catch (error) {
          console.error('Failed to fetch message:', error);
          return;
        }
      }
      
      const message = newMessage as Message;
      
      if (!this.shouldProcessMessage(message)) {
        return;
      }
      
      const member = await this.getMember(message);
      const success = await this.webhookService.editMessage(
        message.id,
        message,
        member || null
      );
      
      if (!success) {
        console.log('Webhook message not found for editing');
      }
    } catch (err) {
      console.error('❌ times編集通知エラー:', err);
    }
  }

  private shouldProcessMessage(message: Message): boolean {
    if (message.author?.bot) return false;
    if (!message.channel.isThread()) return false;
    if (!this.threadService.isTimesThread(message.channel.name)) return false;
    return true;
  }

  private async getMember(message: Message) {
    try {
      return message.member || await message.guild?.members.fetch(message.author!.id).catch(() => null);
    } catch {
      return null;
    }
  }
}