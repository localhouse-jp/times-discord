import {
  Message,
  TextChannel,
  ChannelType
} from 'discord.js';
import { ConfigManager } from '../../config/config-manager';
import { WebhookService } from '../../services/webhook-service';
import { ThreadService } from '../../services/thread-service';

export class MessageCreateHandler {
  private webhookService: WebhookService;
  private threadService: ThreadService;
  private config: ConfigManager;

  constructor(webhookService: WebhookService) {
    this.webhookService = webhookService;
    this.threadService = new ThreadService();
    this.config = ConfigManager.getInstance();
  }

  async handle(message: Message): Promise<void> {
    try {
      if (!this.shouldProcessMessage(message)) {
        return;
      }

      const notificationChannel = await this.getNotificationChannel(message);
      if (!notificationChannel) {
        return;
      }

      const webhookUrl = await this.webhookService.getOrCreateWebhook(notificationChannel);
      if (!webhookUrl) {
        return;
      }

      const member = await this.getMember(message);
      const thread = message.channel;
      
      await this.webhookService.forwardMessage(
        message,
        webhookUrl,
        member || null,
        thread.url
      );
    } catch (err) {
      console.error('❌ times通知エラー:', err);
    }
  }

  private shouldProcessMessage(message: Message): boolean {
    if (!this.config.notificationEnabled) return false;
    if (message.author.bot) return false;
    if (!message.channel.isThread()) return false;
    if (!this.threadService.isTimesThread(message.channel.name)) return false;
    return true;
  }

  private async getNotificationChannel(message: Message): Promise<TextChannel | null> {
    let notificationChannel: TextChannel | null = null;
    
    if (this.config.notificationChannelId) {
      const fetchedChannel = await message.guild?.channels.fetch(this.config.notificationChannelId);
      if (fetchedChannel && fetchedChannel.type === ChannelType.GuildText) {
        notificationChannel = fetchedChannel as TextChannel;
      }
    }
    
    if (!notificationChannel && message.channel.isThread()) {
      const parentChannel = message.channel.parent;
      if (parentChannel && parentChannel.type === ChannelType.GuildText) {
        notificationChannel = parentChannel as TextChannel;
      }
    }
    
    return notificationChannel;
  }

  private async getMember(message: Message) {
    try {
      return message.member || await message.guild?.members.fetch(message.author.id).catch(() => null);
    } catch {
      return null;
    }
  }
}