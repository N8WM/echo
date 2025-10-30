import { MessageFlags } from "discord.js";
import { ErrorHandler } from "@core/registry/errorHandler";
import { Logger } from "@core/logger";

/**
 * Error handler for component (button/modal/select) errors
 *
 * This will be auto-registered for the "component" context
 */
const handler: ErrorHandler = async (error, context) => {
  if (context.type !== "component") return;

  Logger.error(`Component Error (${context.componentId}): ${error.message}`);
  Logger.error(error.stack ?? "");

  const response = {
    content: "An error occurred while processing this interaction.",
    flags: [MessageFlags.Ephemeral] as const
  };

  try {
    if (context.interaction.deferred || context.interaction.replied) {
      await context.interaction.editReply(response.content);
    }
    else {
      await context.interaction.reply(response);
    }
  }
  catch (replyError) {
    Logger.error(`Failed to send error message: ${replyError instanceof Error ? replyError.message : String(replyError)}`);
  }
};

export default handler;
