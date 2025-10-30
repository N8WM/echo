import { ApplicationCommandType, Events } from "discord.js";

import { Logger } from "@core/logger";

import { Registry } from "../../registry";
import { EventHandler } from "../../event";
import { CommandHandler } from "../../command";
import { ErrorHandlerRegistry } from "../../errorHandler";

const handler: EventHandler<Events.InteractionCreate> = {
  async execute(interaction) {
    if (!interaction.isAutocomplete()) return;

    const command = Registry.commands.get(interaction.commandName);
    if (!command) return;

    const handler = command.handler as CommandHandler<ApplicationCommandType.ChatInput>;

    if (!handler.autocomplete) {
      Logger.warn(`Autocomplete interaction for ${interaction.commandName} but no autocomplete handler defined`);
      return;
    }

    try {
      await handler.autocomplete({ interaction, client: interaction.client });
    }
    catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));

      await ErrorHandlerRegistry.handle(error, {
        type: "autocomplete",
        interaction,
        command,
        client: interaction.client
      });
    }
  }
};

export default handler;
