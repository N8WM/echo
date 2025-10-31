import {
  ApplicationCommandType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";

import { CommandHandler } from "@core/registry";

import { getAllPersonas } from "@conversations/loader";

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("conversation-personas")
    .setDescription("List the available conversation personas and their roles")
    .setContexts(InteractionContextType.Guild),

  async run({ interaction }) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const personas = await getAllPersonas();

    const content = personas
      .map((persona) => `**${persona.displayName}** — ${persona.description}`)
      .join("\n\n");

    await interaction.editReply({
      content: content.length > 0
        ? content
        : "No personas are currently defined."
    });
  }
};

export default handler;
