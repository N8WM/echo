import {
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";

import { CommandHandler } from "@core/registry";

import { cancelConversationRun, isConversationRunning } from "@conversations/runner";

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("conversation-cancel")
    .setDescription("Stops a running conversation replay in the specified text channel")
    .setContexts(InteractionContextType.Guild)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to cancel (defaults to the current channel)")
        .addChannelTypes(ChannelType.GuildText)
    ),

  async run({ interaction }) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const channelOption = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channelOption || channelOption.type !== ChannelType.GuildText) {
      await interaction.editReply("Select a guild text channel to cancel the conversation replay.");
      return;
    }

    const targetChannel = channelOption as TextChannel;

    if (!isConversationRunning(targetChannel.id)) {
      await interaction.editReply("No conversation replay is currently running in that channel.");
      return;
    }

    const cancelled = cancelConversationRun(targetChannel.id);
    if (!cancelled) {
      await interaction.editReply("Failed to cancel the conversation. It may have just completed.");
      return;
    }

    await interaction.editReply(`Conversation cancelled in <#${targetChannel.id}>.`);
  }
};

export default handler;
