import { Collection } from "discord.js";

import { ServiceManager } from "@services";
import { Result } from "@lib/result";

import { UserTopic } from "../serializers/topicSerializer";
import { MessageSession } from "./messageSession";

export class TopicSession {
  private _topics: Collection<string, UserTopic>;
  private _guildSnowflake: string;
  private _messageSession?: MessageSession;

  private _summary?: string;
  private _existingTopicId?: string;

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

  get existingTopicId() {
    return this._existingTopicId;
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

  async mergeTopicMessagesWith(existingTopicId: string) {
    const databaseMessages = await ServiceManager.topic.getMessages(existingTopicId);

    if (!databaseMessages) {
      return Result.err("Invalid Topic");
    }

    this._messageSession!.merge(databaseMessages);
    this._existingTopicId = existingTopicId;

    return Result.ok(null);
  }

  async updateExistingTopic(summary: string) {
    const topic = await ServiceManager.topic.mergeNewTopicInto(
      this._existingTopicId!,
      summary,
      this._messageSession!.messages.map((message) => message.databaseMsg)
    );

    if (!topic) {
      return Result.err("Failed to update topic");
    }

    return Result.ok(topic);
  }

  async overwriteExistingTopic(existingTopicId: string) {
    await ServiceManager.topic.deleteTopic(existingTopicId);
    return await this.createNewTopic();
  }
}
