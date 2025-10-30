import { Events } from "discord.js";

import { EmojiManager } from "@lib/emojiManager";
import { EventHandler } from "@core/registry/event";

const handler: EventHandler<Events.ClientReady> = {
  async execute(client) {
    await EmojiManager.init(client);
  },

  once: true
};

export default handler;
