import { Events, MessageFlags } from "discord.js";

import { Logger } from "@core/logger";
import { hasPermissions, botHasPermissions, getMissingPermissions, getBotMissingPermissions } from "@lib/permissions";

import { Registry } from "../../registry";
import { EventHandler } from "../../event";
import { CommandHandler } from "../../command";
import { ErrorHandlerRegistry } from "../../errorHandler";

const handler: EventHandler<Events.InteractionCreate> = {
  async execute(interaction) {
    if (!(interaction.isCommand() || interaction.isContextMenuCommand())) return;

    const command = Registry.commands.get(interaction.commandName)!;
    const handler = command.handler as CommandHandler<
      typeof command.handler.type
    >;

    Logger.debug(
      `[${handler.data.name}] command from ${interaction.user.username} <${interaction.user.id}>`
    );

    // Check user permissions
    if (handler.options?.userPermissions && interaction.isChatInputCommand()) {
      if (!hasPermissions(interaction, handler.options.userPermissions)) {
        const missing = getMissingPermissions(interaction, handler.options.userPermissions);
        await interaction.reply({
          content: `You don't have permission to use this command. Missing: ${missing.join(", ")}`,
          flags: [MessageFlags.Ephemeral]
        });
        return;
      }
    }

    // Check bot permissions
    if (handler.options?.botPermissions && interaction.isChatInputCommand()) {
      if (!botHasPermissions(interaction, handler.options.botPermissions)) {
        const missing = getBotMissingPermissions(interaction, handler.options.botPermissions);
        await interaction.reply({
          content: `I don't have the required permissions. Missing: ${missing.join(", ")}`,
          flags: [MessageFlags.Ephemeral]
        });
        return;
      }
    }

    // Run middleware
    if (handler.options?.middleware && interaction.isChatInputCommand()) {
      for (const middleware of handler.options.middleware) {
        const result = await middleware({
          interaction,
          client: interaction.client
        });

        if (!result.continue) {
          await interaction.reply({
            content: result.error,
            flags: [MessageFlags.Ephemeral]
          });
          return;
        }
      }
    }

    handler
      .run({ interaction: interaction, client: interaction.client })
      .catch(async (e) => {
        const error = e instanceof Error ? e : new Error(String(e));

        // Use error handler registry
        await ErrorHandlerRegistry.handle(error, {
          type: "command",
          interaction,
          command,
          client: interaction.client
        });
      });
  }
};

export default handler;
