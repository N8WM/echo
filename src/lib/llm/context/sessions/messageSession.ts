import { Collection, Message as DiscordMessage, Snowflake } from "discord.js";
import type { Message as DBMessage } from "@prisma/client";

import { Result } from "@lib/result";

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
    direction: "before" | "after" | "around",
    limit: number = 10
  ) {
    const anchor = direction === "around"
      ? this._initialMessage
      : direction === "before"
        ? this._messages.first()!
        : this._messages.last()!;

    const result = await anchor.fetch(direction, limit);
    if (!result.ok) {
      return result;
    }

    result.value.forEach((message, id) => this._messages.set(id, message));

    return Result.ok(this._messages);
  }

  refine(ids: Snowflake[]) {
    ids.forEach((id) => this._messages.delete(id));
    return this._messages;
  }
}
