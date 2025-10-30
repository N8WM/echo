import {
  ButtonBuilder,
  ButtonStyle,
  Collection,
  ContainerBuilder,
  MessageCreateOptions,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";
import type { Message } from "@prisma/client";

import { Result } from "@lib/result";

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

  userQuote(messageSnowflake: string, isNearAnswer: boolean = false) {
    const message = this.messages.get(messageSnowflake);
    if (!message) return Result.err("Invalid Message");

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

    if (isNearAnswer) {
      container.setAccentColor([180, 50, 50]);
    }

    this._components.push(container);
    return Result.ok(message);
  }

  separator() {
    const separator = new SeparatorBuilder()
      .setDivider(false)
      .setSpacing(SeparatorSpacingSize.Large);

    this._components.push(separator);
  }

  context(content: string) {
    const context = new TextDisplayBuilder().setContent(`> ${content}`);
    this._components.push(context);
  }
}
