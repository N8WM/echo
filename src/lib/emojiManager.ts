import {
  ApplicationEmoji,
  Client,
  Collection
} from "discord.js";

import { Logger } from "@core/logger";

export class EmojiManager {
  static registeredEmoji = new Collection<string, ApplicationEmoji>();
  static guildEmoji = new Collection<string, string[]>();

  static initialized = false;
  static client: Client;

  static async init(client: Client) {
    if (EmojiManager.initialized) {
      Logger.warn("EmojiManager should only be initialized once");
      return;
    }

    EmojiManager.client = client;

    const toLoad = await client.application?.emojis.fetch();
    toLoad?.forEach((e) => EmojiManager.registeredEmoji.set(e.name, e));

    EmojiManager.initialized = true;
  }

  static inline(name: string) {
    return EmojiManager.registeredEmoji.get(name)?.toString() ?? "⛶";
  }

  static async getGuildEmojis(guildId: string) {
    if (this.guildEmoji.has(guildId))
      return this.guildEmoji.get(guildId)!;

    const guild = await this.client.guilds.fetch(guildId);
    const emojis = await guild.emojis.fetch();
    const emojiStrings = emojis.map((e) => e.toString());

    this.guildEmoji.set(guildId, emojiStrings);

    return emojiStrings;
  }
}
