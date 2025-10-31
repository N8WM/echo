import {
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";

import { CommandHandler } from "@core/registry";

import { cancelScenarioRun, isScenarioRunning } from "@scenarios/runner";

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("scenario-cancel")
    .setDescription("Stops a running scenario in the specified text channel")
    .setContexts(InteractionContextType.Guild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to cancel (defaults to the current channel)")
        .addChannelTypes(ChannelType.GuildText)
    ),

  async run({ interaction }) {
    await interaction.deferReply({ ephemeral: true });

    const channelOption = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channelOption || channelOption.type !== ChannelType.GuildText) {
      await interaction.editReply("Select a guild text channel to cancel the scenario.");
      return;
    }

    const targetChannel = channelOption as TextChannel;

    if (!isScenarioRunning(targetChannel.id)) {
      await interaction.editReply("No scenario is currently running in that channel.");
      return;
    }

    const cancelled = cancelScenarioRun(targetChannel.id);
    if (!cancelled) {
      await interaction.editReply("Failed to cancel the scenario. It may have just completed.");
      return;
    }

    await interaction.editReply(`Scenario cancelled in <#${targetChannel.id}>.`);
  }
};

export default handler;
