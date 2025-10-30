import {
  ApplicationCommandType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { build } from "@app/components/ping";

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Responds with latency values")
    .setContexts(InteractionContextType.Guild),

  async run({ interaction }) {
    await interaction.reply({
      components: [build(interaction)],
      flags: [MessageFlags.IsComponentsV2]
    });
  }
};

export default handler;
