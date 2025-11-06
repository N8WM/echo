import { ToolFor } from "../../context/toolBinding";

export class RecordTools {
  static needMoreContext(): ToolFor<{ temporalDirection: string }> {
    return {
      type: "function",
      function: {
        name: "needMoreContext",
        description: "Retrieve more context in the specified temporal direction",
        parameters: {
          type: "object",
          required: ["temporalDirection"],
          properties: {
            temporalDirection: {
              type: "string",
              enum: ["before", "after"],
              description:
                "The temporal direction to retrieve more context from. \"before\" retrieves earlier messages, \"after\" retrieves later messages."
            }
          }
        }
      }
    };
  }

  static removeMessages(ids: string[]): ToolFor<{ messageIds: string[] }> {
    return {
      type: "function",
      function: {
        name: "removeMessages",
        description: "Remove irrelevant messages from the excerpt to help focus on the main topic",
        parameters: {
          type: "object",
          required: ["messageIds"],
          properties: {
            messageIds: {
              type: "array",
              enum: ids,
              description: "An array of message IDs (strings) to remove from the excerpt. Only use message IDs present in the excerpt."
            }
          }
        }
      }
    };
  }

  static updateExistingTopic(ids: string[]): ToolFor<{ existingTopicId: string }> {
    return {
      type: "function",
      function: {
        name: "updateExistingTopic",
        description: "Update an existing topic with messages from the new topic and generate a new summary",
        parameters: {
          type: "object",
          required: ["existingTopicId"],
          properties: {
            existingTopicId: {
              type: "string",
              enum: ids,
              description: "A topic ID to update with messages from the new topic. Only use a topic ID that is present."
            }
          }
        }
      }
    };
  }

  static overwriteExistingTopic(ids: string[]): ToolFor<{ existingTopicId: string }> {
    return {
      type: "function",
      function: {
        name: "overwriteExistingTopic",
        description: "Overwrite an existing topic with the new topic, if old topic is outdated or conflicts with new topic",
        parameters: {
          type: "object",
          required: ["existingTopicId"],
          properties: {
            existingTopicId: {
              type: "string",
              enum: ids,
              description: "A topic ID to overwrite with the new topic. Only use a topic ID that is present."
            }
          }
        }
      }
    };
  }
}
