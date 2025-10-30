import { Message as DiscordMessage } from "discord.js";
import { Message as LLMMessage } from "ollama";

import { Result } from "@lib/result";

import { LLMSession } from "../../context/sessions/llmSession";
import { MessageSession } from "../../context/sessions/messageSession";
import { TopicSession } from "../../context/sessions/topicSession";
import { RecordPrompts } from "./recordPrompts";
import { RecordTools } from "./recordTools";

export class RecordSequence {
  static async execute(
    discordMessage: DiscordMessage,
    updateCb: (message: string) => Promise<unknown>,
    loopMax: number = 15
  ) {
    const messageSession = new MessageSession(discordMessage);
    const topicSession = new TopicSession({ messageSession });
    const llmSession = new LLMSession();

    const toolResult: LLMMessage = { role: "tool", content: "done" };

    updateCb("Analyzing message...");

    let result = await messageSession.expand("around");
    if (!result.ok) return result;

    let response = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.contextExpansion(
          messageSession.initialMessage.serialized,
          messageSession.serialized()
        )
      },
      { flush: true, tools: [RecordTools.needMoreContext()] }
    );

    let toolCalls = response.message.tool_calls;
    let call = toolCalls?.at(0);

    let iterations = 0;

    while (call && iterations++ < loopMax) {
      updateCb(`Expanding context (${iterations})...`);

      await llmSession.message(toolResult, { flush: false });

      const args = call.function.arguments as { temporalDirection: "before" | "after" };
      result = await messageSession.expand(args.temporalDirection, 5);

      if (!result.ok) return result;

      response = await llmSession.message(
        {
          role: "user",
          content: RecordPrompts.contextExpansionLoop(
            args.temporalDirection,
            messageSession.initialMessage.serialized,
            messageSession.serialized()
          )
        },
        { flush: true, tools: [RecordTools.needMoreContext()] }
      );

      toolCalls = response.message.tool_calls;
      call = toolCalls?.at(0);
    }

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
        tools: [RecordTools.removeMessages(ids)]
      }
    );

    toolCalls = response.message.tool_calls;
    call = toolCalls?.at(0);

    if (call) {
      const args = call.function.arguments as { messageIds: string[] };
      messageSession.refine(args.messageIds);
      await llmSession.message(toolResult, { flush: false });
    }

    updateCb("Summarizing topic...");
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

    response = await llmSession.message(
      {
        role: "user",
        content: RecordPrompts.integrationPrompt(
          summary,
          topicSession.serialized()
        )
      },
      {
        flush: true,
        tools: [
          RecordTools.updateExistingTopic(ids),
          RecordTools.overwriteExistingTopic(ids)
        ]
      }
    );

    toolCalls = response.message.tool_calls;
    call = toolCalls?.at(0);

    if (!call) {
      updateCb("Creating new topic...");
      return Result.ok(await topicSession.createNewTopic());
    }

    await llmSession.message(toolResult, { flush: false });

    const validCalls = ["updateExistingTopic", "overwriteExistingTopic"] as const;
    const functionName = call.function.name as typeof validCalls[number];

    if (!validCalls.includes(functionName)) {
      return Result.err("Function call name not recognized");
    }

    const args = call.function.arguments as { existingTopicId: string };

    if (functionName === "overwriteExistingTopic") {
      updateCb("Replacing an old topic...");
      return Result.ok(await topicSession.overwriteExistingTopic(args.existingTopicId));
    }

    updateCb("Merging with another topic...");

    await topicSession.mergeTopicMessagesWith(args.existingTopicId);
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

    const newSummary = response.message.content;
    const updateResult = await topicSession.updateExistingTopic(newSummary);

    updateCb("Finished!");

    return updateResult;
  }
}
