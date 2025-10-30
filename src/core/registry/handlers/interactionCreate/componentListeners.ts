import { Events } from "discord.js";

import { Logger } from "@core/logger";
import { ComponentRegistry } from "../../component";
import { EventHandler } from "../../event";
import { ErrorHandlerRegistry } from "../../errorHandler";

const handler: EventHandler<Events.InteractionCreate> = {
  async execute(interaction) {
    // Handle button interactions
    if (interaction.isButton()) {
      const handler = ComponentRegistry.getButton(interaction.customId);

      if (!handler) {
        Logger.warn(`No handler found for button: ${interaction.customId}`);
        return;
      }

      Logger.debug(
        `[Button:${interaction.customId}] from ${interaction.user.username} <${interaction.user.id}>`
      );

      handler
        .execute({ interaction, client: interaction.client })
        .catch(async (e) => {
          const error = e instanceof Error ? e : new Error(String(e));

          await ErrorHandlerRegistry.handle(error, {
            type: "component",
            interaction,
            componentId: interaction.customId,
            client: interaction.client
          });
        });

      return;
    }

    // Handle modal submissions
    if (interaction.isModalSubmit()) {
      const handler = ComponentRegistry.getModal(interaction.customId);

      if (!handler) {
        Logger.warn(`No handler found for modal: ${interaction.customId}`);
        return;
      }

      Logger.debug(
        `[Modal:${interaction.customId}] from ${interaction.user.username} <${interaction.user.id}>`
      );

      handler
        .execute({ interaction, client: interaction.client })
        .catch(async (e) => {
          const error = e instanceof Error ? e : new Error(String(e));

          await ErrorHandlerRegistry.handle(error, {
            type: "component",
            interaction,
            componentId: interaction.customId,
            client: interaction.client
          });
        });

      return;
    }

    // Handle select menu interactions
    if (interaction.isAnySelectMenu()) {
      const handler = ComponentRegistry.getSelectMenu(interaction.customId);

      if (!handler) {
        Logger.warn(`No handler found for select menu: ${interaction.customId}`);
        return;
      }

      Logger.debug(
        `[SelectMenu:${interaction.customId}] from ${interaction.user.username} <${interaction.user.id}>`
      );

      handler
        .execute({ interaction, client: interaction.client })
        .catch(async (e) => {
          const error = e instanceof Error ? e : new Error(String(e));

          await ErrorHandlerRegistry.handle(error, {
            type: "component",
            interaction,
            componentId: interaction.customId,
            client: interaction.client
          });
        });
    }
  }
};

export default handler;
