import { Collection, Message as DiscordMessage, Snowflake } from "discord.js";
import { Message as DBMessage } from "@prisma/client";
import { create } from "xmlbuilder2";

import { Result } from "@lib/result";

import { InterfaceManager } from "../interfaceManager";
import * as utilitySerializer from "./utilitySerializer";

export type UserMessageOptions
  = { discordMsg: DiscordMessage }
  | { databaseMsg: DBMessage }
  | { discordMsg: DiscordMessage; databaseMsg: DBMessage };

const fromDiscordMsg = (discordMessage: DiscordMessage): DBMessage => ({
  guildSnowflake: discordMessage.guildId!,
  channelSnowflake: discordMessage.channelId,
  messageSnowflake: discordMessage.id,
  authorSnowflake: discordMessage.author.id,
  content: discordMessage.content,
  timestamp: discordMessage.createdAt,
  createdAt: new Date(),
  topicId: ""
});

const eofMarker = (eof: boolean, temporalDirection: "before" | "after") =>
  eof
    ? create({
      EOF: {
        "@side": temporalDirection
      }
    }).end({ prettyPrint: true, headless: true })
    : "";

export const msgJSON = (message: DBMessage) => ({
  Message: {
    msgId: message.messageSnowflake,
    msgTimestamp: message.timestamp.toISOString(),
    msgAuthorId: message.authorSnowflake,
    msgChannelId: message.channelSnowflake,
    msgContent: { $: utilitySerializer.escapeCData(message.content) }
  }
});

const serializeMessage = (message: DBMessage) =>
  create(msgJSON(message)).end({ prettyPrint: true, headless: true });

export class UserMessage {
  private _discordMsg?: DiscordMessage;
  private _databaseMsg: DBMessage;
  private _serialized?: string;

  private _EOFBefore = false;
  private _EOFAfter = false;

  constructor(options: UserMessageOptions) {
    this._discordMsg = "discordMsg" in options ? options.discordMsg : undefined;
    this._databaseMsg = "databaseMsg" in options
      ? options.databaseMsg
      : fromDiscordMsg(options.discordMsg);
  }

  static dbComparator = (a: DBMessage, b: DBMessage) =>
    a.timestamp.getTime() - b.timestamp.getTime();

  static umComparator = (a: UserMessage, b: UserMessage) =>
    a._databaseMsg.timestamp.getTime() - b._databaseMsg.timestamp.getTime();

  static joinSerialized(messages: Collection<Snowflake, UserMessage>) {
    return messages
      .sorted(UserMessage.umComparator)
      .map((message) => message.serialized)
      .join("\n\n");
  }

  get discordMsg() {
    return this._discordMsg;
  }

  get databaseMsg() {
    return this._databaseMsg;
  }

  get serialized() {
    if (!this._serialized) {
      this._serialized = serializeMessage(this._databaseMsg);
    }

    const marked = [
      eofMarker(this._EOFBefore, "before"),
      this._serialized,
      eofMarker(this._EOFAfter, "after")
    ]
      .filter(Boolean)
      .join("\n\n");

    return marked;
  }

  get eofBefore() {
    return this._EOFBefore;
  }

  get eofAfter() {
    return this._EOFAfter;
  }

  async ensureDiscordMsg() {
    if (this._discordMsg) return;

    const result = await InterfaceManager.messages.getMessage(
      this._databaseMsg.guildSnowflake,
      this._databaseMsg.channelSnowflake,
      this._databaseMsg.messageSnowflake
    );

    if (result.ok) {
      this._discordMsg = result.value;
    }
  }

  async fetch(
    temporalDirection: "before" | "after" | "around" = "around",
    limit: number = 10
  ) {
    await this.ensureDiscordMsg();

    if (!this._discordMsg) {
      return Result.err("Invalid Message");
    }

    const messagesResult = await InterfaceManager.messages.getMessages(
      this._discordMsg,
      temporalDirection,
      limit
    );

    const userMessages = Result.map(
      messagesResult,
      (messages) => messages.mapValues(
        (message) => new UserMessage({ discordMsg: message })
      )
    );

    if (!userMessages.ok) {
      return userMessages;
    }

    if (userMessages.value.size === 0) {
      this._EOFBefore = temporalDirection !== "after";
      this._EOFAfter = temporalDirection !== "before";
      return userMessages;
    }

    const sorted = userMessages.value.sorted(UserMessage.umComparator);

    if (temporalDirection !== "after") {
      await sorted.first()!.checkEOF("before");
    }

    if (temporalDirection !== "before") {
      await sorted.last()!.checkEOF("after");
    }

    return userMessages;
  }

  private async checkEOF(temporalDirection: "before" | "after" | "around") {
    if (temporalDirection !== "after") {
      await this.fetch("before", 1);
    }
    if (temporalDirection !== "before") {
      await this.fetch("after", 1);
    }
  }
}
