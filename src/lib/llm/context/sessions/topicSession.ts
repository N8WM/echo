import { Collection } from "discord.js";

import { ServiceManager } from "@services";

import { UserTopic } from "../serializers/topicSerializer";
import { MessageSession } from "./messageSession";

export class TopicSession {
  private _topics: Collection<string, UserTopic>;
  private _guildSnowflake: string;
  private _messageSession?: MessageSession;

  private _summary?: string;

  constructor(options: { guildSnowflake: string } | { messageSession: MessageSession }) {
    this._topics = new Collection();

    this._guildSnowflake = "guildSnowflake" in options
      ? options.guildSnowflake
      : options.messageSession.initialMessage.databaseMsg.guildSnowflake;

    this._messageSession = "messageSession" in options
      ? options.messageSession
      : undefined;
  }

  get topics() {
    return this._topics;
  }

  get summary() {
    return this._summary;
  }

  setNewSummary(summary: string) {
    this._summary = summary;
  }

  serialized() {
    return UserTopic.joinSerialized(this._topics);
  }

  async createNewTopic() {
    return await ServiceManager.topic.newTopic(
      this._guildSnowflake,
      this._summary!,
      this._messageSession!.messages.map((message) => message.databaseMsg)
    );
  }

  async findSimilarTopics() {
    const databaseTopics = await ServiceManager.topic.getRelatedTopics(
      this._summary ?? "",
      this._guildSnowflake
    );

    databaseTopics.forEach((topic) => {
      this._topics.set(topic.id, new UserTopic(topic));
    });
  }

  async findAnsweringTopics(question: string) {
    const databaseTopics = await ServiceManager.topic.getRelatedTopicsWithMessages(
      question,
      this._guildSnowflake
    );

    databaseTopics.forEach((topic) => {
      this._topics.set(topic.id, new UserTopic(topic));
    });
  }

  async updateExistingTopic(args: { existingTopicId: string }) {
    const databaseMessages = await ServiceManager.topic.getMessages(args.existingTopicId);

    if (!databaseMessages) throw new Error("Failed to fetch existing topic messages");

    this._messageSession!.merge(databaseMessages);

    const topic = await ServiceManager.topic.mergeNewTopicInto(
      args.existingTopicId,
      this._messageSession!.messages.map((message) => message.databaseMsg)
    );

    if (!topic) throw new Error("Failed to merge messages into existing topic");

    return topic;
  }

  async overwriteExistingTopic(args: { existingTopicId: string }) {
    await ServiceManager.topic.deleteTopic(args.existingTopicId);
    return await this.createNewTopic();
  }
}
