import { RecordTools } from "./recordTools";

export class RecordPrompts {
  static contextExpansion(initiatedMessage: string, messages: string) {
    return [
      `The following messages are an excerpt from a Discord conversation. The final goal is to use relevant messages to generate a conversation topic and summary to be used to answer similar questions in the future. Your current task is to source context to form a complete concept. If you believe there may be adjacent messages missing from the excerpt that are necessary to understand the context, add to the context by calling the \`${RecordTools.needMoreContext().function.name}\` function. Otherwise, do not call any functions, and it will be assumed that all context is now accounted for. Context is likely not missing in a particular direction if messages in that direction are unrelated. Consider context missing if:`,
      `- The conversation references something not explained in the current messages`,
      `- The conversation starts or ends mid-thought`,
      ``,
      `There may be occasional unrelated messages in the excerpt, but if the majority of messages are related to the topic in a particular temporal direction, it is likely that more context is needed. Context may be needed in both directions, in such a case, only worry about one direction. You will have another chance to get context in the other direction later.`,
      `Only perform a maximum of one function call.`,
      ``,
      `Finally, if you see "<EOF />", it means there are no more messages in that direction.`,
      ``,
      `Initiated Message:`,
      `${initiatedMessage}`,
      ``,
      `Context Excerpt Messages:`,
      `${messages}`
    ].join("\n");
  }

  static contextExpansionLoop(temporalDirection: string, initiatedMessage: string, messages: string) {
    return [
      `The following messages are the resulting extended excerpt after your call to \`${RecordTools.needMoreContext().function.name}("${temporalDirection}")\`. Please once again evaluate if there may be adjacent messages missing from the excerpt that are necessary to understand the context. If you believe more context is needed, call the \`${RecordTools.needMoreContext().function.name}\` function again. Otherwise, do not call any functions, and it will be assumed that all context is now accounted for.`,
      `Only perform a maximum of one function call.`,
      ``,
      `Initiated Message:`,
      `${initiatedMessage}`,
      ``,
      `Context Excerpt Messages:`,
      `${messages}`
    ].join("\n");
  }

  static contextRefinementPrompt(initiatedMessage: string, messages: string) {
    return [
      `The following messages are an excerpt from a Discord conversation. The final goal is to use relevant messages to generate a conversation topic and summary to be used to answer similar questions in the future. Your current task is to refine the context to focus on the main topic. If you believe there are irrelevant or off-topic messages in the excerpt that do not contribute to the main topic, remove them by calling the \`${RecordTools.removeMessages([]).function.name}\` function, with the id's of the messages in question. Only remove messages that are clearly irrelevant to the main topic. Do not remove a message if it includes any information that could be beneficial to someone searching for the topic. If all messages are relevant, do not call any functions, and such will be inferred. Consider messages irrelevant if they are off-topic or do not contribute to the main discussion topic.`,
      `Do NOT remove the initiated message, as it is always relevant.`,
      `Only perform a maximum of one function call.`,
      ``,
      `Initiated Message:`,
      `${initiatedMessage}`,
      ``,
      `Context Excerpt Messages:`,
      `${messages}`
    ].join("\n");
  }

  static summarizationPrompt(initiatedMessage: string, messages: string) {
    return [
      `The following messages are an excerpt from a Discord conversation. Your task is to generate a concise summary of the main topic discussed in the conversation, in the form of one or more factual statements. The summary should be brief, capturing the essence of the discussion in a few sentences. Focus on the key points and avoid referencing specific messages or who sent them. Only output the summary without any additional commentary. The summary text will be used in its entirety as the summary.`,
      `The message identified as the "initiated message" is particularly important, as it should be used to indicate the topic for the entire conversation. Ensure that the summary accurately reflects the topic introduced by this message.`,
      ``,
      `Initiated Message:`,
      `${initiatedMessage}`,
      ``,
      `Context Excerpt Messages:`,
      `${messages}`
    ].join("\n");
  }

  static integrationPrompt(newTopicSummary: string, existingTopics: string) {
    return [
      `The following is your summary of the newly identified topic from a Discord conversation, followed by a list of existing topics with their respective summaries, selected by embedding similarity. Your task is to determine if the new topic overlaps with any existing topics. If there is significant overlap, you may choose to update an existing topic by incorporating messages from the new topic and generating a new summary, or overwrite an existing topic if it is outdated or conflicts with the new topic. This can be done through the respective tool calls. If there is no significant overlap, do not call any functions, and it will be assumed that the new topic is distinct.`,
      `Only perform a maximum of one function call.`,
      ``,
      `New Topic Summary:`,
      `${newTopicSummary}`,
      ``,
      `Existing Topics:`,
      `${existingTopics}`
    ].join("\n");
  }
}
