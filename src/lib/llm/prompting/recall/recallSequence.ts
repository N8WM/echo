import { LLMSession } from "../../context/sessions/llmSession";
import { TopicSession } from "../../context/sessions/topicSession";
import { ToolBinding, ToolBindingRecord } from "../../context/toolBinding";
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

    const bindings = {
      userQuote: new ToolBinding(RecallTools.userQuote(exchange.messages.keys().toArray()), exchange.userQuote.bind(exchange)),
      context: new ToolBinding(RecallTools.context(), exchange.context.bind(exchange))
    } satisfies ToolBindingRecord;

    response = await llmSession.message(
      {
        role: "user",
        content: RecallPrompts.exchangeLoopStart()
      },
      { tools: bindings, flush: true, thinking: false }
    );

    await updateCb("Finished!");

    return exchange.components;
  }
}
