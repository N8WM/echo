import { Collection, Snowflake } from "discord.js";
import { create } from "xmlbuilder2";
import type { Topic, Message } from "@prisma/client";

import { msgJSON, UserMessage } from "./messageSerializer";
import { escapeCData } from "./utilitySerializer";

export type TopicWithMessages = Topic & { messages: Message[] };

export class UserTopic {
  private _databaseTopic: Topic | TopicWithMessages;
  private _serialized?: string;
  private _databaseMsgs?: Message[];

  constructor(databaseTopic: Topic | TopicWithMessages) {
    this._databaseTopic = databaseTopic;
    if ("messages" in databaseTopic) {
      this._databaseMsgs = databaseTopic.messages;
    }
  }

  get databaseTopic() {
    return this._databaseTopic;
  }

  get databaseMsgs() {
    return this._databaseMsgs;
  }

  get serialized() {
    if (this._serialized) {
      return this._serialized;
    }

    if (this._databaseMsgs === undefined) {
      this._serialized = serializeTopic(this._databaseTopic);
    }
    else {
      this._serialized = serializeTopicWithMessages(
        this._databaseTopic,
        this._databaseMsgs
      );
    }

    return this._serialized;
  }

  static joinSerialized(topics: Collection<Snowflake, UserTopic>) {
    return topics.map((topic) => topic.serialized).join("\n\n");
  }
}

const serializeTopic = (topic: Topic) =>
  create({
    Topic: {
      topicId: topic.id,
      topicSummary: { $: escapeCData(topic.summary) }
    }
  }).end({ prettyPrint: true, headless: true });

const serializeTopicWithMessages = (topic: Topic, messages: Message[]) =>
  create({
    Topic: {
      topicId: topic.id,
      topicSummary: { $: escapeCData(topic.summary) },
      topicMessages: {
        Message: messages
          .toSorted(UserMessage.dbComparator)
          .map((message) => msgJSON(message).Message)
      }
    }
  }).end({ prettyPrint: true, headless: true });
