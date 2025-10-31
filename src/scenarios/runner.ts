import { setTimeout as sleep } from "node:timers/promises";

import {
  TextChannel,
  WebhookClient,
  Webhook
} from "discord.js";

import { Logger } from "@core/logger";

import { LoadedScenario } from "./types";

const activeRuns = new Map<string, ScenarioRunInternal>();

export type ScenarioRunProgress = {
  index: number;
  total: number;
  actorId: string;
  content: string;
};

export type ScenarioRunResult = {
  channelId: string;
  scenarioName: string;
  completed: boolean;
  error?: Error;
};

export type ScenarioRunOptions = {
  scenario: LoadedScenario;
  channel: TextChannel;
  delayMs: number;
  requestedBy: string;
  onProgress?: (progress: ScenarioRunProgress) => Promise<void> | void;
  onFinish?: (result: ScenarioRunResult) => Promise<void> | void;
};

type ScenarioRunInternal = {
  webhook: Webhook;
  webhookClient: WebhookClient;
  abortController: AbortController;
  promise: Promise<void>;
};

export class ScenarioAlreadyRunningError extends Error {
  constructor(channelId: string) {
    super(`A scenario is already running in channel ${channelId}`);
    this.name = "ScenarioAlreadyRunningError";
  }
}

export class ScenarioRunCancelledError extends Error {
  constructor() {
    super("Scenario run cancelled");
    this.name = "ScenarioRunCancelledError";
  }
}

export type ScenarioRunHandle = {
  promise: Promise<void>;
};

async function cleanupRun(channelId: string, run?: ScenarioRunInternal) {
  if (!run) return;

  try {
    await run.webhook.delete("Scenario runner cleanup");
  } catch (error) {
    Logger.warn(`Failed to delete scenario webhook: ${String(error)}`);
  }

  try {
    run.webhookClient.destroy();
  } catch (error) {
    Logger.warn(`Failed to destroy webhook client: ${String(error)}`);
  }

  activeRuns.delete(channelId);
}

export async function startScenarioRun(options: ScenarioRunOptions) {
  const { channel, scenario } = options;

  if (activeRuns.has(channel.id)) {
    throw new ScenarioAlreadyRunningError(channel.id);
  }

  const webhook = await channel.createWebhook({
    name: `Scenario: ${scenario.name}`,
    reason: `Scenario runner requested by ${options.requestedBy}`
  });

  if (!webhook.token) {
    await webhook.delete("Missing token for scenario runner");
    throw new Error("Failed to obtain webhook token for scenario runner");
  }

  const webhookClient = new WebhookClient({
    id: webhook.id,
    token: webhook.token
  });

  const abortController = new AbortController();
  const run: ScenarioRunInternal = {
    webhook,
    webhookClient,
    abortController,
    promise: Promise.resolve()
  };

  activeRuns.set(channel.id, run);

  const execute = async () => {
    try {
      for (let index = 0; index < scenario.events.length; index += 1) {
        if (abortController.signal.aborted) {
          throw new ScenarioRunCancelledError();
        }

        const event = scenario.events[index];
        const actor = scenario.actors.get(event.actorId);
        if (!actor) {
          Logger.warn(
            `Skipping event ${index + 1}: actor ${event.actorId} no longer available`
          );
          continue;
        }

        if (index !== 0) {
          const delay = Math.max(options.delayMs, 500);
          await sleep(delay, undefined, { signal: abortController.signal });
        }

        if (abortController.signal.aborted) {
          throw new ScenarioRunCancelledError();
        }

        await webhookClient.send({
          content: event.content,
          username: actor.displayName,
          avatarURL: actor.avatarUrl
        });

        await options.onProgress?.({
          index: index + 1,
          total: scenario.events.length,
          actorId: actor.id,
          content: event.content
        });
      }

      await options.onFinish?.({
        channelId: channel.id,
        scenarioName: scenario.name,
        completed: true
      });
    } catch (error) {
      const runError = error instanceof Error ? error : new Error(String(error));
      if (runError.name !== "ScenarioRunCancelledError") {
        Logger.error(
          `Scenario "${scenario.name}" failed in channel ${channel.id}: ${runError.message}`
        );
      }

      await options.onFinish?.({
        channelId: channel.id,
        scenarioName: scenario.name,
        completed: false,
        error: runError
      });

      throw runError;
    } finally {
      await cleanupRun(channel.id, run);
    }
  };

  run.promise = execute();
  return { promise: run.promise };
}

export function cancelScenarioRun(channelId: string) {
  const run = activeRuns.get(channelId);
  if (!run) return false;

  run.abortController.abort();
  return true;
}

export function isScenarioRunning(channelId: string) {
  return activeRuns.has(channelId);
}
