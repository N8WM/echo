import { Collection, Message as DiscordMessage, Snowflake } from "discord.js";
import type { Message as DBMessage } from "@prisma/client";

import { UserMessage } from "../serializers/messageSerializer";

export class MessageSession {
  private _initialMessage: UserMessage;
  private _messages: Collection<Snowflake, UserMessage>;

  constructor(initialDiscordMsg: DiscordMessage) {
    this._initialMessage = new UserMessage({ discordMsg: initialDiscordMsg });
    this._messages = new Collection();

    this._messages.set(
      this._initialMessage.databaseMsg.messageSnowflake,
      this._initialMessage
    );
  }

  get messages() {
    return this._messages;
  }

  get initialMessage() {
    return this._initialMessage;
  }

  merge(additionalMessages: DBMessage[]) {
    additionalMessages
      .filter((message) => !this._messages.has(message.messageSnowflake))
      .forEach((message) =>
        this._messages.set(
          message.messageSnowflake,
          new UserMessage({ databaseMsg: message })
        )
      );
  }

  serialized() {
    return UserMessage.joinSerialized(this._messages);
  }

  async expand(
    args: { temporalDirection: "before" | "after" | "around" },
    limit: number = 10
  ) {
    const anchor = args.temporalDirection === "around"
      ? this._initialMessage
      : args.temporalDirection === "before"
        ? this._messages.first()!
        : this._messages.last()!;

    const result = await anchor.fetch(args.temporalDirection, limit);
    if (!result.ok) {
      return result.error;
    }

    result.value.forEach((message, id) => this._messages.set(id, message));

    return `Updated Context Excerpt Messages:\n${this.serialized()}`;
  }

  refine(args: { messageIds: Snowflake[] }) {
    args.messageIds.forEach((id) => this._messages.delete(id));

    return `Updated Context Excerpt Messages:\n${this.serialized()}`;
  }
}
