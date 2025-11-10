import {
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { Logger } from "@core/logger";
import { getConversationManifest } from "@conversations/manifest";
import { ensureTextChannel } from "@conversations/adminUtils";
import { getPersonaMap, loadConversation } from "@conversations/loader";
import { startConversationRun } from "@conversations/runner";
import { RecordSequence } from "@lib/llm";

const DEFAULT_DELAY_MS = 1200;

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("seed-conversations")
    .setDescription("Replay every scripted conversation into the configured channels")
    .setContexts(InteractionContextType.Guild)
    .addBooleanOption((option) =>
      option
        .setName("record")
        .setDescription("Immediately run the Remember Topic workflow for configured messages")
    )
    .addIntegerOption((option) =>
      option
        .setName("delay")
        .setDescription("Delay between seeded messages in milliseconds (default 1200)")
        .setMinValue(500)
        .setMaxValue(10_000)
    ),
  options: {
    botPermissions: [
      "ManageChannels",
      "ManageWebhooks",
      "SendMessages",
      "ViewChannel",
      "ReadMessageHistory"
    ]
  },

  async run({ interaction }) {
    if (!interaction.guild) {
      await interaction.reply({
        content: "You need to run this command inside the target guild.",
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    const manifest = getConversationManifest();
    if (manifest.length === 0) {
      await interaction.reply({
        content: "Conversation manifest is empty.",
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    const shouldRecord = interaction.options.getBoolean("record") ?? true;
    const delayOverride = interaction.options.getInteger("delay");
    const channel = interaction.channel?.isSendable() ? interaction.channel : null;
    const statusMessage = await channel?.send("Booting up...");

    await interaction.reply({
      content: "Seeding conversations... this may take a while.",
      flags: [MessageFlags.Ephemeral]
    });

    const updateStatus = async (content: string) => {
      await statusMessage!.edit(content);
    };

    const personaCatalog = await getPersonaMap();
    const recordQueue: {
      conversation: string;
      eventIndex: number;
      channelId: string;
      messageId: string;
    }[] = [];
    const failures: string[] = [];
    let seededCount = 0;

    for (const entry of manifest) {
      try {
        const channel = await ensureTextChannel(interaction.guild, entry.channel);
        await updateStatus(`Seeding **${entry.name}** in <#${channel.id}> (${seededCount}/${manifest.length})...`);

        const conversation = await loadConversation(entry.name);
        const delayMs = entry.delayMs ?? delayOverride ?? DEFAULT_DELAY_MS;
        const recordTargets = new Set(
          shouldRecord ? entry.recordMessages ?? [] : []
        );

        const run = await startConversationRun({
          conversation,
          channel,
          delayMs,
          requestedBy: `${interaction.user.username} (${interaction.user.id})`,
          personaCatalog,
          onMessage: recordTargets.size > 0
            ? async ({ eventIndex, message }) => {
              if (!recordTargets.has(eventIndex)) return;
              recordQueue.push({
                conversation: entry.name,
                eventIndex,
                channelId: channel.id,
                messageId: message.id
              });
            }
            : undefined
        });

        await run.promise;
        seededCount += 1;
      }
      catch (error) {
        Logger.error(`Failed to seed conversation ${entry.name}: ${error instanceof Error ? error.message : String(error)}`);
        failures.push(`Seed: ${entry.name} (${error instanceof Error ? error.message : String(error)})`);
      }
    }

    let recordSummary = "";

    if (shouldRecord && recordQueue.length > 0) {
      await updateStatus(
        `Seeded ${seededCount}/${manifest.length} conversations.\nStarting recording for ${recordQueue.length} message(s)...`
      );
      let recorded = 0;

      for (const item of recordQueue) {
        try {
          const fetchedChannel = await interaction.client.channels.fetch(item.channelId);
          if (!fetchedChannel || fetchedChannel.type !== ChannelType.GuildText) {
            failures.push(`Record: Cannot fetch channel for ${item.conversation}`);
            continue;
          }

          const textChannel = fetchedChannel as TextChannel;
          const message = await textChannel.messages.fetch(item.messageId);

          await updateStatus(
            `Recording ${recorded + 1}/${recordQueue.length}: **${item.conversation}** (event #${item.eventIndex})...`
          );

          await RecordSequence.execute(message, async (status) => {
            await updateStatus(
              `Recording ${recorded + 1}/${recordQueue.length}: **${item.conversation}** (event #${item.eventIndex})\n${status}`
            );
          });

          recorded += 1;
        }
        catch (error) {
          failures.push(`Record: ${item.conversation} event #${item.eventIndex}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      recordSummary = `\nRecorded ${recorded}/${recordQueue.length} configured messages.`;
      await updateStatus(recordSummary.trim().length > 0 ? recordSummary : "Recording phase complete.");
    }

    const summary = [
      `Seeded ${seededCount}/${manifest.length} conversations.`,
      recordSummary.trim(),
      failures.length > 0
        ? `\nWarnings:\n${failures.slice(-10).map((line) => `- ${line}`).join("\n")}`
        : ""
    ]
      .filter(Boolean)
      .join("\n");

    await updateStatus(summary);
  }
};

export default handler;
