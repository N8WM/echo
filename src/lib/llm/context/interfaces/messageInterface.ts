import { Message } from "discord.js";

import { Result } from "@lib/result";

import { BaseInterface } from "./baseInterface";

export class MessageInterface extends BaseInterface {
  async getMessage(
    guildSnowflake: string,
    channelSnowflake: string,
    messageSnowflake: string
  ) {
    try {
      const guild = await this.client.guilds.fetch(guildSnowflake);
      const channel = await guild.channels.fetch(channelSnowflake);

      if (!channel || !channel.isTextBased()) {
        return Result.err("Invalid channel");
      }

      const message = await channel.messages.fetch(messageSnowflake);
      return Result.ok(message);
    }
    catch (error) {
      return Result.err(`Failed to fetch message: ${error}`);
    }
  }

  async getMessages(
    message: Message,
    temporalDirection: "before" | "after" | "around" = "around",
    limit: number = 10
  ) {
    try {
      const messages = await message.channel.messages.fetch({
        [temporalDirection]: message.id,
        limit
      });

      return Result.ok(messages);
    }
    catch (error) {
      return Result.err(`Failed to fetch messages: ${error}`);
    }
  }
}
