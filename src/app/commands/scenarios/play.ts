import {
  ApplicationCommandType,
  ChannelType,
  InteractionContextType,
  SlashCommandBuilder,
  TextChannel
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { Logger } from "@core/logger";

import { listScenarios, loadScenario } from "@scenarios/loader";
import {
  isScenarioRunning,
  startScenarioRun
} from "@scenarios/runner";

const MIN_DELAY_MS = 500;
const DEFAULT_DELAY_MS = 2500;
const AUTOCOMPLETE_CACHE_TTL_MS = 5_000;

type ScenarioAutocompleteCache = {
  expiresAt: number;
  items: Awaited<ReturnType<typeof listScenarios>>;
};

let scenarioCache: ScenarioAutocompleteCache | null = null;

async function getScenarioAutocompleteChoices() {
  const now = Date.now();
  if (scenarioCache && scenarioCache.expiresAt > now) {
    return scenarioCache.items;
  }

  const items = await listScenarios();
  scenarioCache = {
    items,
    expiresAt: now + AUTOCOMPLETE_CACHE_TTL_MS
  };

  return items;
}

const handler: CommandHandler<ApplicationCommandType.ChatInput> = {
  type: ApplicationCommandType.ChatInput,
  data: new SlashCommandBuilder()
    .setName("scenario-play")
    .setDescription("Replay a scripted conversation in the current guild using webhooks")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option
        .setName("scenario")
        .setDescription("Scenario identifier (use tab to autocomplete)")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to run the scenario in (defaults to the current channel)")
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
    if (focused.name !== "scenario") return;

    const scenarios = await getScenarioAutocompleteChoices();
    const query = focused.value.toLowerCase();

    const filtered = scenarios.filter(({ name, description }) =>
      query.length === 0
        || name.toLowerCase().includes(query)
        || description?.toLowerCase().includes(query)
    );

    const choices = filtered.slice(0, 25).map((scenario) => ({
      name: scenario.description
        ? `${scenario.name} – ${scenario.description}`.slice(0, 100)
        : scenario.name,
      value: scenario.name
    }));

    await interaction.respond(choices);
  },

  async run({ interaction }) {
    await interaction.deferReply({ ephemeral: true });

    const scenarioName = interaction.options.getString("scenario", true);
    const delayValue = interaction.options.getInteger("delay") ?? DEFAULT_DELAY_MS;

    const channelOption = interaction.options.getChannel("channel") ?? interaction.channel;

    if (!channelOption || channelOption.type !== ChannelType.GuildText) {
      await interaction.editReply("Select a guild text channel to run the scenario.");
      return;
    }

    const targetChannel = channelOption as TextChannel;

    if (isScenarioRunning(targetChannel.id)) {
      await interaction.editReply("A scenario is already running in that channel. Cancel it first.");
      return;
    }

    let delayMs = delayValue;
    if (delayMs < MIN_DELAY_MS) delayMs = MIN_DELAY_MS;

    try {
      const scenario = await loadScenario(scenarioName);

      await interaction.editReply(
        `Starting scenario **${scenario.name}** in <#${targetChannel.id}>...`
      );

      const startedAt = Date.now();
      let lastProgressUpdate = startedAt;

      const run = await startScenarioRun({
        scenario,
        channel: targetChannel,
        delayMs,
        requestedBy: `${interaction.user.username} (${interaction.user.id})`,
        onProgress: async ({ index, total, actorId }) => {
          const now = Date.now();
          if (now - lastProgressUpdate < 1500 && index !== total) return;
          lastProgressUpdate = now;

          const actorName =
            scenario.actors.get(actorId)?.displayName ?? actorId;

          try {
            await interaction.editReply(
              `Running **${scenario.name}** in <#${targetChannel.id}> — ${index}/${total} messages sent (latest: ${actorName}).`
            );
          } catch (progressError) {
            Logger.warn(
              `Failed to send scenario progress update: ${progressError instanceof Error ? progressError.message : String(progressError)}`
            );
          }
        },
        onFinish: async ({ completed, error }) => {
          const duration = Math.round((Date.now() - startedAt) / 1000);

          let message: string;
          if (completed) {
            message = `Scenario **${scenario.name}** finished in ${duration}s in <#${targetChannel.id}>.`;
          } else if (error?.name === "ScenarioRunCancelledError") {
            message = `Scenario **${scenario.name}** was cancelled after ${duration}s in <#${targetChannel.id}>.`;
          } else {
            message = `Scenario **${scenario.name}** stopped with an error after ${duration}s: ${error?.message ?? "Unknown error"}`;
          }

          try {
            await interaction.editReply(message);
          } catch (finishError) {
            Logger.warn(
              `Failed to send scenario completion update: ${finishError instanceof Error ? finishError.message : String(finishError)}`
            );
          }
        }
      });

      run.promise.catch((error) => {
        if (error?.name === "ScenarioRunCancelledError") return;
        Logger.error(
          `Scenario "${scenario.name}" crashed in channel ${targetChannel.id}: ${error instanceof Error ? error.message : String(error)}`
        );
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await interaction.editReply(`Failed to start scenario: ${message}`);
    }
  }
};

export default handler;
