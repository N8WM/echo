import {
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ContainerBuilder,
  MessageCreateOptions,
  SectionBuilder,
  TextDisplayBuilder
} from "discord.js";
import type { Message } from "@prisma/client";

import { TopicSession } from "../../context/sessions/topicSession";

export class ExchangeBuilder {
  private readonly _topicSession: TopicSession;
  private readonly _components: [...NonNullable<MessageCreateOptions["components"]>];
  private _messages?: Collection<string, Message>;

  constructor(topicSession: TopicSession) {
    this._topicSession = topicSession;
    this._components = [];
  }

  get components() {
    return this._components;
  }

  get messages() {
    if (!this._messages) {
      this._messages = this._topicSession.topics.flatMap(
        (topic) => new Collection(
          topic.databaseMsgs?.map((message) => [message.messageSnowflake, message])
        )
      );
    }

    return this._messages;
  }

  userQuote(args: { messageId: string }) {
    const message = this.messages.get(args.messageId);
    if (!message) return "Invalid Message";

    const container = new ContainerBuilder().addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# <@${message.authorSnowflake}>  ${message.timestamp.toLocaleString("en-US", { timeStyle: "short", dateStyle: "short" })}`
          ),
          new TextDisplayBuilder().setContent(message.content)
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Jump")
            .setURL(`https://discord.com/channels/${message.guildSnowflake}/${message.channelSnowflake}/${message.messageSnowflake}`)
        )
    );

    this._components.push(container);
    return `ADDED: userQuote("${message.messageSnowflake}")`;
  }

  context(args: { content: string }) {
    const context = new TextDisplayBuilder().setContent(`> ${args.content}`);
    this._components.push(context);
    return `ADDED: context("${args.content}")`;
  }
}
