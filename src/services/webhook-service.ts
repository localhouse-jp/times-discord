import {
  TextChannel,
  WebhookClient,
  Message,
  PermissionFlagsBits,
  User,
  GuildMember
} from 'discord.js';
import { CONSTANTS } from '../constants';
import { getDisplayNameForNotification } from '../util';
import { logger } from '../utils/logger';
import { WebhookError, PermissionError } from '../utils/errors';

interface WebhookInfo {
  webhookId: string;
  webhookToken: string;
  messageId: string;
}

export class WebhookService {
  private webhookMessages = new Map<string, WebhookInfo>();

  async getOrCreateWebhook(channel: TextChannel): Promise<string | null> {
    try {
      const me = channel.guild.members.me;
      if (!me) return null;
      
      const permissions = channel.permissionsFor(me);
      if (!permissions?.has(PermissionFlagsBits.ManageWebhooks)) {
        logger.error(`Bot lacks MANAGE_WEBHOOKS permission in channel: ${channel.name}`);
        throw new PermissionError('Missing MANAGE_WEBHOOKS permission', { channel: channel.name });
      }
      
      const webhooks = await channel.fetchWebhooks();
      let webhook = webhooks.find(wh => wh.name === CONSTANTS.WEBHOOK_NAME);
      
      if (!webhook) {
        webhook = await channel.createWebhook({
          name: CONSTANTS.WEBHOOK_NAME,
          reason: 'For forwarding times thread messages'
        });
      }
      
      return webhook.url;
    } catch (err) {
      if (err instanceof PermissionError) {
        logger.warn('Webhook creation skipped due to permissions');
      } else {
        logger.error('Webhook作成エラー:', err);
      }
      return null;
    }
  }

  async forwardMessage(
    message: Message,
    webhookUrl: string,
    member: GuildMember | null,
    threadUrl: string
  ): Promise<void> {
    const webhookClient = new WebhookClient({ url: webhookUrl });
    
    try {
      const displayName = getDisplayNameForNotification(member, message.author);
      const threadLink = `\n[スレッドで見る](${threadUrl})`;
      const contentWithLink = message.content ? `${message.content}${threadLink}` : threadLink;
      
      const webhookMessage = await webhookClient.send({
        content: contentWithLink,
        username: `${displayName} (times)`,
        avatarURL: message.author.displayAvatarURL(),
        embeds: message.embeds,
        files: message.attachments.map(a => a.url),
        allowedMentions: { parse: [] }
      });
      
      const urlParts = webhookUrl.match(/webhooks\/(\d+)\/([^/]+)/);
      if (urlParts && webhookMessage) {
        this.webhookMessages.set(message.id, {
          webhookId: urlParts[1],
          webhookToken: urlParts[2],
          messageId: webhookMessage.id
        });
      }
    } finally {
      webhookClient.destroy();
    }
  }

  async editMessage(
    messageId: string,
    newMessage: Message,
    member: GuildMember | null
  ): Promise<boolean> {
    const webhookInfo = this.webhookMessages.get(messageId);
    if (!webhookInfo) return false;
    
    const webhookClient = new WebhookClient({
      id: webhookInfo.webhookId,
      token: webhookInfo.webhookToken
    });
    
    try {
      await webhookClient.editMessage(webhookInfo.messageId, {
        content: newMessage.content || undefined,
        embeds: newMessage.embeds,
        files: newMessage.attachments.map(a => a.url),
        allowedMentions: { parse: [] }
      });
      return true;
    } catch (err) {
      console.error('Webhook編集エラー:', err);
      return false;
    } finally {
      webhookClient.destroy();
    }
  }

  getWebhookInfo(messageId: string): WebhookInfo | undefined {
    return this.webhookMessages.get(messageId);
  }
}