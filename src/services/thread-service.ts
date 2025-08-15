import {
  TextChannel,
  ThreadChannel,
  User,
  GuildMember,
  ChannelType,
  Guild
} from 'discord.js';
import { CONSTANTS } from '../constants';
import { findExistingTimesThread, buildThreadName } from '../util';

export class ThreadService {
  async findOrCreateThread(
    channel: TextChannel,
    user: User,
    member: GuildMember | null
  ): Promise<{ thread: ThreadChannel | null; existing: boolean; error?: string }> {
    const existing = await findExistingTimesThread(
      channel,
      user.id,
      member || user
    );
    
    if (existing) {
      return { thread: existing, existing: true };
    }
    
    try {
      const threadName = buildThreadName(member || user);
      const thread = await channel.threads.create({
        name: threadName,
        autoArchiveDuration: CONSTANTS.DEFAULT_ARCHIVE_MINUTES as any,
        reason: `times for ${user.tag}`,
        invitable: false
      });
      
      return { thread, existing: false };
    } catch (err) {
      console.error('スレッド作成エラー:', err);
      return { thread: null, existing: false, error: 'スレッド作成に失敗しました' };
    }
  }

  async sendGreeting(
    thread: ThreadChannel,
    user: User,
    greetingMessage: string
  ): Promise<void> {
    const mention = `<@${user.id}>`;
    const greetingContent = greetingMessage.replace('{mention}', mention);
    const content = greetingContent + CONSTANTS.RENAME_TIP;
    await thread.send({ content });
  }

  async notifyTimeline(
    guild: Guild | null,
    member: GuildMember | null,
    user: User,
    thread: ThreadChannel
  ): Promise<void> {
    if (!guild) return;
    
    try {
      const timelineChannel = guild.channels.cache.find(
        ch => ch.name === CONSTANTS.TIMELINE_CHANNEL && ch.type === ChannelType.GuildText
      ) as TextChannel | undefined;
      
      if (timelineChannel) {
        const displayName = member ? 
          (member.nickname || member.displayName || user.username) : 
          user.username;
        await timelineChannel.send({
          content: `🎉 **${displayName}** さんがtimesスレッドを作成しました！ → ${thread.toString()}`
        });
      }
    } catch (err) {
      console.error('times-timeline通知エラー:', err);
    }
  }

  isTimesThread(threadName: string): boolean {
    return threadName.startsWith(CONSTANTS.THREAD_PREFIX);
  }

  async verifyThreadOwnership(
    thread: ThreadChannel,
    userId: string,
    member: GuildMember | null,
    user: User
  ): Promise<boolean> {
    const expectedThreadName = buildThreadName(member || user);
    
    if (thread.name === expectedThreadName || thread.name.includes(userId)) {
      return true;
    }
    
    try {
      const firstMessages = await thread.messages.fetch({ limit: 1, after: '0' });
      const firstMessage = firstMessages.first();
      
      if (firstMessage && firstMessage.author.bot) {
        const mentionMatch = firstMessage.content.match(/<@(\d+)>/);
        if (mentionMatch && mentionMatch[1] === userId) {
          return true;
        }
      }
      
      return thread.name.includes(user.username);
    } catch (error) {
      console.error('スレッド所有者の確認エラー:', error);
      return false;
    }
  }

  sanitizeThreadName(name: string): string {
    return name.replace(/[^\w\-ぁ-んァ-ヴー一-龠]/g, '')
      .slice(0, CONSTANTS.MAX_THREAD_NAME_LENGTH);
  }
}