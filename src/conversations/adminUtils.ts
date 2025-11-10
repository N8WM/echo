import { ChannelType, Guild, TextChannel } from "discord.js";

export async function ensureTextChannel(
  guild: Guild,
  channelName: string
): Promise<TextChannel> {
  const normalized = channelName.toLowerCase();
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText
      && channel.name === normalized
  ) as TextChannel | undefined;

  if (existing) {
    return existing;
  }

  return await guild.channels.create({
    name: normalized,
    type: ChannelType.GuildText
  });
}
