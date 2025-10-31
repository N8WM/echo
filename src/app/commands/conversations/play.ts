import {
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { Logger } from "@core/logger";

import { getPersonaMap, listConversations, loadConversation } from "@conversations/loader";
import {
  isConversationRunning,
  startConversationRun
} from "@conversations/runner";

const MIN_DELAY_MS = 500;
const DEFAULT_DELAY_MS = 2500;
const AUTOCOMPLETE_CACHE_TTL_MS = 5_000;

type ConversationAutocompleteCache = {
  expiresAt: number;
  items: Awaited<ReturnType<typeof listConversations>>;
};

let conversationCache: ConversationAutocompleteCache | null = null;

async function getConversationAutocompleteChoices() {
  const now = Date.now();
  if (conversationCache && conversationCache.expiresAt > now) {
    return conversationCache.items;
  }

  const items = await listConversations();
  conversationCache = {
    items,
    expiresAt: now + AUTOCOMPLETE_CACHE_TTL_MS
  };

  return items;
}

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("conversation-play")
    .setDescription("Replay a scripted archived conversation in the current guild using webhooks")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option
        .setName("conversation")
        .setDescription("Conversation identifier (use tab to autocomplete)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to replay the conversation in (defaults to the current channel)")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addIntegerOption((option) =>
      option
        .setName("delay")
        .setDescription("Delay between messages in milliseconds (min 500, default 2500)")
        .setMinValue(MIN_DELAY_MS)
    ),

  async autocomplete({ interaction }) {
    const focused = interaction.options.getFocused(true);
    if (focused.name !== "conversation") return;

    const conversations = await getConversationAutocompleteChoices();
    const query = focused.value.toLowerCase();

    const filtered = conversations.filter(({ name, description }) =>
      query.length === 0
        || name.toLowerCase().includes(query)
        || description?.toLowerCase().includes(query)
    );

    const choices = filtered.slice(0, 25).map((conversation) => ({
      name: conversation.description
        ? `${conversation.name} – ${conversation.description}`.slice(0, 100)
        : conversation.name,
      value: conversation.name
    }));

    await interaction.respond(choices);
  },

  async run({ interaction }) {
    await interaction.deferReply({ ephemeral: true });

    const conversationName = interaction.options.getString("conversation", true);
    const delayValue = interaction.options.getInteger("delay") ?? DEFAULT_DELAY_MS;

    const channelOption = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channelOption || channelOption.type !== ChannelType.GuildText) {
      await interaction.editReply("Select a guild text channel to replay the conversation.");
      return;
    }

    const targetChannel = channelOption as TextChannel;

    if (isConversationRunning(targetChannel.id)) {
      await interaction.editReply("A conversation replay is already running in that channel. Cancel it first.");
      return;
    }

    let delayMs = delayValue;
    if (delayMs < MIN_DELAY_MS) delayMs = MIN_DELAY_MS;

    try {
      const [conversation, personaCatalog] = await Promise.all([
        loadConversation(conversationName),
        getPersonaMap()
      ]);

      await interaction.editReply(
        `Starting conversation **${conversation.name}** in <#${targetChannel.id}>...`
      );

      const startedAt = Date.now();
      let lastProgressUpdate = startedAt;

      const run = await startConversationRun({
        conversation,
        channel: targetChannel,
        delayMs,
        requestedBy: `${interaction.user.username} (${interaction.user.id})`,
        personaCatalog,
        onProgress: async ({ index, total, personaId }) => {
          const now = Date.now();
          if (now - lastProgressUpdate < 1500 && index !== total) return;
          lastProgressUpdate = now;

          const personaName =
            conversation.personas.get(personaId)?.displayName ?? personaId;

          try {
            await interaction.editReply(
              `Replaying **${conversation.name}** in <#${targetChannel.id}> — ${index}/${total} messages sent (latest: ${personaName}).`
            );
          } catch (progressError) {
            Logger.warn(
              `Failed to send conversation progress update: ${progressError instanceof Error ? progressError.message : String(progressError)}`
            );
          }
        },
        onFinish: async ({ completed, error }) => {
          const duration = Math.round((Date.now() - startedAt) / 1000);

          let message: string;
          if (completed) {
            message = `Conversation **${conversation.name}** finished in ${duration}s in <#${targetChannel.id}>.`;
          } else if (error?.name === "ConversationRunCancelledError") {
            message = `Conversation **${conversation.name}** was cancelled after ${duration}s in <#${targetChannel.id}>.`;
          } else {
            message = `Conversation **${conversation.name}** stopped with an error after ${duration}s: ${error?.message ?? "Unknown error"}`;
          }

          try {
            await interaction.editReply(message);
          } catch (finishError) {
            Logger.warn(
              `Failed to send conversation completion update: ${finishError instanceof Error ? finishError.message : String(finishError)}`
            );
          }
        }
      });

      run.promise.catch((error) => {
        if (error?.name === "ConversationRunCancelledError") return;
        Logger.error(
          `Conversation "${conversation.name}" crashed in channel ${targetChannel.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`Failed to start conversation: ${message}`);
    }
  }
};

export default handler;
