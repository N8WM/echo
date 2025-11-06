import type { Message } from "@prisma/client";
import { getRelatedTopics } from "@prisma/client/sql";

import { BaseService } from "./baseService";

const prepareMessages = (
  topicId: string,
  messages: Omit<Message, "createdAt">[]
): Omit<Message, "createdAt">[] =>
  messages.map((message) => ({
    guildSnowflake: message.guildSnowflake,
    channelSnowflake: message.channelSnowflake,
    messageSnowflake: message.messageSnowflake,
    authorSnowflake: message.authorSnowflake,
    content: message.content,
    timestamp: message.timestamp,
    topicId
  }));

export class TopicService extends BaseService {
  async get(id: string) {
    return await this.prisma.topic.findUnique({ where: { id } });
  }

  async getMessages(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: { messages: true }
    });

    return topic?.messages ?? null;
  }

  async newTopic(
    guildSnowflake: string,
    summary: string,
    messages: Omit<Message, "createdAt">[]
  ) {
    const topic = await this.prisma.topic.create({
      data: {
        guildSnowflake,
        summary
      }
    });

    if (messages.length > 0) {
      await this.prisma.message.createMany({
        data: prepareMessages(topic.id, messages)
      });
    }

    return topic;
  }

  async deleteTopic(id: string) {
    return await this.prisma.topic.delete({ where: { id } });
  }

  async mergeNewTopicInto(
    existingId: string,
    messages: Omit<Message, "createdAt">[]
  ) {
    const topic = await this.prisma.topic.findUnique({ where: { id: existingId } });
    if (!topic) return null;

    const upserts = prepareMessages(existingId, messages).map((message) =>
      this.prisma.message.upsert({
        where: {
          messageSnowflake_topicId: {
            messageSnowflake: message.messageSnowflake,
            topicId: message.topicId
          }
        },
        create: message,
        update: { content: message.content }
      })
    );

    if (upserts.length > 0) {
      await this.prisma.$transaction(upserts);
    }

    return topic;
  }

  async getRelatedTopics(query: string, guildSnowflake: string) {
    const related = await this.prisma.$queryRawTyped(
      getRelatedTopics(query, guildSnowflake)
    );
    const topicIds = related.map((topic) => topic.id!).filter(Boolean);

    if (topicIds.length === 0) return [];

    return await this.prisma.topic.findMany({
      where: { id: { in: topicIds } }
    });
  }

  async getRelatedTopicsWithMessages(query: string, guildSnowflake: string) {
    const related = await this.prisma.$queryRawTyped(
      getRelatedTopics(query, guildSnowflake)
    );
    const topicIds = related.map((topic) => topic.id!).filter(Boolean);

    if (topicIds.length === 0) return [];

    return await this.prisma.topic.findMany({
      where: { id: { in: topicIds } },
      include: { messages: true }
    });
  }
}
