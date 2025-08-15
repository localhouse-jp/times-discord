import { ChannelType, TextChannel, GuildMember, User, ThreadChannel } from 'discord.js';

/**
 * 対象ユーザーの既存 times スレッドを探索（アクティブ＋アーカイブ）
 * 名前規約: "times-<display>-<userId>"
 */
export async function findExistingTimesThread(
  channel: TextChannel,
  userId: string
): Promise<ThreadChannel | null> {
  if (!channel || channel.type !== ChannelType.GuildText) return null;

  // アクティブスレッド
  const active = await channel.threads.fetchActive();
  const hitActive = active.threads.find(t => t.name.includes(userId));
  if (hitActive) return hitActive;

  // アーカイブ（公開）スレッド
  const archived = await channel.threads.fetchArchived();
  const hitArchived = archived.threads.find(t => t.name.includes(userId));
  if (hitArchived) return hitArchived;

  // 必要に応じて private を探索（通常のTextチャンネルでは不要）
  // const archivedPrivate = await channel.threads.fetchArchived({ type: 'private' });

  return null;
}

/**
 * スレッド名を規格化
 */
export function buildThreadName(memberOrUser: GuildMember | User): string {
  // 表示名優先（GuildMember.displayName）。なければ username
  const display = 
    (memberOrUser instanceof GuildMember ? memberOrUser.displayName : null) ||
    (memberOrUser as any)?.user?.username ||
    (memberOrUser as User)?.username ||
    'user';
  
  const id = 
    (memberOrUser instanceof GuildMember ? memberOrUser.id : null) ||
    (memberOrUser as any)?.user?.id ||
    (memberOrUser as User)?.id;
  
  // 長すぎ回避のため display を短縮
  const safe = display.replace(/[^\w\-ぁ-んァ-ヴー一-龠]/g, '').slice(0, 18);
  return `times-${safe}-${id}`;
}