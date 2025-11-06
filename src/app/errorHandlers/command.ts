import { MessageFlags } from "discord.js";
import { ErrorHandler } from "@core/registry/errorHandler";
import { Logger } from "@core/logger";

/**
 * Error handler for command errors
 *
 * This will be auto-registered for the "command" context
 */
const handler: ErrorHandler = async (error, context) => {
  if (context.type !== "command") return;

  Logger.error(`Command Error (${context.command.name}): ${error.message}`);
  Logger.error(error.stack ?? String(error));

  const response = {
    content: "An error occurred while executing this command.",
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
