import { ChannelType, TextChannel, GuildMember, User, ThreadChannel } from 'discord.js';

/**
 * 対象ユーザーの既存 times スレッドを探索（アクティブ＋アーカイブ）
 * 名前規約: "times-<name>"
 */
export async function findExistingTimesThread(
  channel: TextChannel,
  userId: string,
  memberOrUser?: GuildMember | User
): Promise<ThreadChannel | null> {
  if (!channel || channel.type !== ChannelType.GuildText) return null;

  // Build expected thread name pattern
  const expectedName = memberOrUser ? buildThreadName(memberOrUser) : null;
  
  // アクティブスレッド
  const active = await channel.threads.fetchActive();
  // First try exact match, then fallback to userId
  const hitActive = active.threads.find(t => 
    (expectedName && t.name === expectedName) || t.name.includes(userId)
  );
  if (hitActive) return hitActive;

  // アーカイブ（公開）スレッド
  const archived = await channel.threads.fetchArchived();
  const hitArchived = archived.threads.find(t => 
    (expectedName && t.name === expectedName) || t.name.includes(userId)
  );
  if (hitArchived) return hitArchived;

  // 必要に応じて private を探索（通常のTextチャンネルでは不要）
  // const archivedPrivate = await channel.threads.fetchArchived({ type: 'private' });

  return null;
}

/**
 * スレッド名を規格化
 * 名前規約: "times-<name>"
 */
export function buildThreadName(memberOrUser: GuildMember | User): string {
  // ニックネーム（GuildMember.nickname）優先、次に表示名、最後にusername
  const display = 
    (memberOrUser instanceof GuildMember ? memberOrUser.nickname || memberOrUser.displayName : null) ||
    (memberOrUser as any)?.user?.username ||
    (memberOrUser as User)?.username ||
    'user';
  
  // 長すぎ回避のため display を短縮 (スレッド名は100文字制限)
  const safe = display.replace(/[^\w\-ぁ-んァ-ヴー一-龠]/g, '').slice(0, 90);
  return `times-${safe}`;
}

/**
 * 通知用の表示名を取得（ニックネーム優先）
 */
export function getDisplayNameForNotification(member: GuildMember | null, user: User): string {
  if (member) {
    return member.nickname || member.displayName || user.username;
  }
  return user.username;
}