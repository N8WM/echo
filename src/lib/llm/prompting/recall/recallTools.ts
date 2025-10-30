import { Tool } from "ollama";

export class RecallTools {
  static userQuote(ids: string[]): Tool {
    return {
      type: "function",
      function: {
        name: "userQuote",
        description: "Add a quoted message from a user",
        parameters: {
          type: "object",
          required: ["messageId"],
          properties: {
            messageId: {
              type: "string",
              enum: ids,
              description: "The ID of the message to quote"
            },
            isNearAnswer: {
              type: "boolean",
              description: "Whether to mark this quote as \"Maybe Helpful But Not an Answer\" (default to false)"
            }
          }
        }
      }
    };
  }

  static separator(): Tool {
    return {
      type: "function",
      function: {
        name: "separator",
        description: "Add a separator/divider line to visually distinguish the following quote(s) from the previous one(s) (optional, for easier reading)"
      }
    };
  }

  static context(): Tool {
    return {
      type: "function",
      function: {
        name: "context",
        description: "Add brief context to align the asked question with the following quote(s), so the user doesn't need to look back at their question",
        parameters: {
          type: "object",
          required: ["content"],
          properties: {
            content: {
              type: "string",
              description: "The textual content of the context"
            }
          }
        }
      }
    };
  }
}
