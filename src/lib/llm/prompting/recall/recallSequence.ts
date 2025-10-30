import { Message } from "ollama";

import { TopicSession } from "../../context/sessions/topicSession";
import { LLMSession } from "../../context/sessions/llmSession";
import { ExchangeBuilder } from "./exchangeBuilder";
import { RecallPrompts } from "./recallPrompts";
import { RecallTools } from "./recallTools";

export class RecallSequence {
  static async execute(
    question: string,
    timestamp: Date,
    askerId: string,
    guildSnowflake: string,
    updateCb: (message: string, component?: boolean) => Promise<unknown>
  ) {
    const topicSession = new TopicSession({ guildSnowflake });
    const llmSession = new LLMSession();

    await topicSession.findAnsweringTopics(question);

    await updateCb("Planning an exchange...");

    const exchange = new ExchangeBuilder(topicSession);

    let response = await llmSession.message(
      {
        role: "user",
        content: RecallPrompts.planExchange(
          question,
          askerId,
          timestamp.toISOString(),
          topicSession.serialized()
        )
      },
      { flush: true }
    );

    const tools = (alreadyAdded?: string[]) => [
      RecallTools.userQuote(
        exchange.messages
          .keys()
          .toArray()
          .filter((messageId) => !(alreadyAdded ?? []).includes(messageId))
      ),
      RecallTools.separator(),
      RecallTools.context()
    ];

    const toolResult: Message = { role: "tool", content: "done" };

    response = await llmSession.message(
      {
        role: "user",
        content: RecallPrompts.exchangeLoopStart()
      },
      { tools: tools(), flush: true }
    );

    let iterations = 0;
    let toolCalls = response.message.tool_calls ?? [];
    const added: string[] = [];

    while (toolCalls.length !== 0 && iterations++ < 20) {
      for (const call of toolCalls) {
        switch (call.function.name) {
          case "userQuote": {
            const args = call.function.arguments as { messageId: string; mhbna?: boolean };
            exchange.userQuote(args.messageId, args.mhbna ?? false);
            added.push(args.messageId);
            await updateCb(".", true);
            break;
          }
          case "separator":
            exchange.separator();
            added.push("separator");
            await updateCb("-", true);
            break;
          case "context":
          default: {
            const args = call.function.arguments as { content: string };
            exchange.context(args.content);
            added.push(`"${args.content}"`);
            await updateCb(">", true);
          }
        }

        await llmSession.message(toolResult, { flush: false });
      }

      const addedLog = added.length > 0
        ? added
          .map((entry) =>
            entry === "separator"
              ? `${entry}()`
              : /^".*"$/.test(entry)
                ? `context(${entry})`
                : `userQuote("${entry}")`
          )
          .join("\n")
        : "NOTHING YET";

      response = await llmSession.message(
        {
          role: "user",
          content: RecallPrompts.exchangeLoop(addedLog)
        },
        { flush: true, tools: tools(added) }
      );

      toolCalls = response.message.tool_calls ?? [];
    }

    await updateCb("Finished!");

    return exchange.components;
  }
}
