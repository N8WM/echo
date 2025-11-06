import { Message as DiscordMessage } from "discord.js";
import { Topic } from "@prisma/client";

import { LLMSession } from "../../context/sessions/llmSession";
import { MessageSession } from "../../context/sessions/messageSession";
import { TopicSession } from "../../context/sessions/topicSession";
import { ToolBinding } from "../../context/toolBinding";
import { RecordPrompts } from "./recordPrompts";
import { RecordTools } from "./recordTools";

export class RecordSequence {
  static async execute(
    discordMessage: DiscordMessage,
    updateCb: (message: string) => Promise<unknown>
  ) {
    const messageSession = new MessageSession(discordMessage);
    const topicSession = new TopicSession({ messageSession });
    const llmSession = new LLMSession();

    const bindingBuilders = {
      needMoreContext: () => new ToolBinding(
        RecordTools.needMoreContext(),
        messageSession.expand.bind(messageSession)
      ),
      removeMessages: (ids: string[]) => new ToolBinding(
        RecordTools.removeMessages(ids),
        messageSession.refine.bind(messageSession)
      ),
      updateExistingTopic: (ids: string[]) => new ToolBinding(
        RecordTools.updateExistingTopic(ids),
        topicSession.updateExistingTopic.bind(topicSession)
      ),
      overwriteExistingTopic: (ids: string[]) => new ToolBinding(
        RecordTools.overwriteExistingTopic(ids),
        topicSession.overwriteExistingTopic.bind(topicSession)
      )
    };

    updateCb("Analyzing message...");

    await messageSession.expand({ temporalDirection: "around" });

    let response = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.contextExpansion(
          messageSession.initialMessage.serialized,
          messageSession.serialized()
        )
      },
      {
        flush: true,
        thinking: false,
        tools: { needMoreContext: bindingBuilders.needMoreContext() }
      }
    );

    updateCb("Refining context...");
    llmSession.forget();

    let ids = messageSession.messages.map((message) => message.databaseMsg.messageSnowflake);

    response = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.contextRefinementPrompt(
          messageSession.initialMessage.serialized,
          messageSession.serialized()
        )
      },
      {
        flush: true,
        tools: { removeMessages: bindingBuilders.removeMessages(ids) }
      }
    );

    updateCb("Generating topic...");
    llmSession.forget();

    response = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.summarizationPrompt(
          messageSession.initialMessage.serialized,
          messageSession.serialized()
        )
      },
      { flush: true }
    );

    const summary = response.message.content;

    updateCb("Checking for similar topics...");

    topicSession.setNewSummary(summary);
    await topicSession.findSimilarTopics();

    ids = topicSession.topics.map((topic) => topic.databaseTopic.id);

    const result = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.integrationPrompt(
          summary,
          topicSession.serialized()
        )
      },
      {
        flush: true,
        tools: {
          updateExistingTopic: bindingBuilders.updateExistingTopic(ids),
          overwriteExistingTopic: bindingBuilders.overwriteExistingTopic(ids)
        },
        allowMultipleCalls: false,
        returnValue: true
      }
    );

    if (!result) {
      const value = await topicSession.createNewTopic();
      updateCb("Done! Created a new topic.");
      return value;
    }

    const fnName = result[0];
    const value = result[1] as Topic;

    if (fnName === "overwriteExistingTopic") updateCb("Done! Replaced an old topic.");
    else updateCb("Done! Merged with an existing topic.");

    return value;
  }
}
