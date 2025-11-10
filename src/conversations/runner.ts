import { setTimeout as sleep } from "node:timers/promises";

import {
  Message,
  TextChannel,
  WebhookClient,
  Webhook
} from "discord.js";

import { Logger } from "@core/logger";

import { LoadedConversation, ConversationPersona, ConversationEvent } from "./types";

const activeRuns = new Map<string, ConversationRunInternal>();

export type ConversationRunProgress = {
  index: number;
  total: number;
  personaId: string;
  content: string;
};

export type ConversationRunResult = {
  channelId: string;
  conversationName: string;
  completed: boolean;
  error?: Error;
};

export type ConversationRunOptions = {
  conversation: LoadedConversation;
  channel: TextChannel;
  delayMs: number;
  requestedBy: string;
  personaCatalog: Map<string, ConversationPersona>;
  onProgress?: (progress: ConversationRunProgress) => Promise<void> | void;
  onFinish?: (result: ConversationRunResult) => Promise<void> | void;
  onMessage?: (info: {
    eventIndex: number;
    event: ConversationEvent;
    message: Message;
  }) => Promise<void> | void;
};

type ConversationRunInternal = {
  personaClients: Map<string, PersonaClient>;
  abortController: AbortController;
  promise: Promise<void>;
};

type PersonaClient = {
  persona: ConversationPersona;
  webhook: Webhook;
  client: WebhookClient;
};

export class ConversationAlreadyRunningError extends Error {
  constructor(channelId: string) {
    super(`A conversation replay is already running in channel ${channelId}`);
    this.name = "ConversationAlreadyRunningError";
  }
}

export class ConversationRunCancelledError extends Error {
  constructor() {
    super("Conversation run cancelled");
    this.name = "ConversationRunCancelledError";
  }
}

export type ConversationRunHandle = {
  promise: Promise<void>;
};

function isManagedWebhook(webhook: Webhook, botId: string | null): boolean {
  if (!botId) return false;
  if (webhook.owner && "id" in webhook.owner && webhook.owner.id === botId) return true;
  if (webhook.applicationId === botId) return true;
  return false;
}

async function preparePersonaClients(
  channel: TextChannel,
  personaCatalog: Map<string, ConversationPersona>,
  requiredPersonas: Map<string, ConversationPersona>,
  requestedBy: string
): Promise<Map<string, PersonaClient>> {
  const botUserId = channel.client.user?.id ?? null;
  if (!botUserId) {
    throw new Error("Bot user is not ready to manage webhooks");
  }

  const personaByDisplay = new Map<string, ConversationPersona>();
  personaCatalog.forEach((persona) => {
    personaByDisplay.set(persona.displayName, persona);
  });

  const existingClients = new Map<string, PersonaClient>();
  const webhooks = await channel.fetchWebhooks();

  const seenPersonaIds = new Set<string>();

  for (const webhook of webhooks.values()) {
    if (!isManagedWebhook(webhook, botUserId)) continue;

    const persona = personaByDisplay.get(webhook.name ?? "");
    if (!persona) {
      try {
        await webhook.delete("Removing unmanaged conversation persona webhook");
      }
      catch (error) {
        Logger.warn(`Failed to delete unknown conversation webhook: ${String(error)}`);
      }
      continue;
    }

    if (seenPersonaIds.has(persona.id)) {
      try {
        await webhook.delete("Removing duplicate conversation persona webhook");
      }
      catch (error) {
        Logger.warn(`Failed to delete duplicate conversation webhook: ${String(error)}`);
      }
      continue;
    }

    seenPersonaIds.add(persona.id);

    if (!requiredPersonas.has(persona.id)) {
      continue;
    }

    if (!webhook.token) {
      try {
        await webhook.delete("Conversation persona webhook missing token");
      }
      catch (error) {
        Logger.warn(`Failed to delete tokenless conversation webhook: ${String(error)}`);
      }
      continue;
    }

    existingClients.set(persona.id, {
      persona,
      webhook,
      client: new WebhookClient({ id: webhook.id, token: webhook.token })
    });
  }

  for (const persona of requiredPersonas.values()) {
    if (existingClients.has(persona.id)) continue;

    let webhook: Webhook | null = null;
    try {
      webhook = await channel.createWebhook({
        name: persona.displayName,
        reason: `Conversation persona ${persona.id} requested by ${requestedBy}`
      });
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create webhook for persona "${persona.displayName}": ${message}`
      );
    }

    if (!webhook.token) {
      await webhook.delete("Conversation persona webhook missing token after creation");
      throw new Error(`Failed to obtain token for persona "${persona.displayName}"`);
    }

    existingClients.set(persona.id, {
      persona,
      webhook,
      client: new WebhookClient({ id: webhook.id, token: webhook.token })
    });
  }

  return existingClients;
}

async function cleanupRun(channelId: string, run?: ConversationRunInternal) {
  if (!run) return;

  try {
    for (const { client } of run.personaClients.values()) {
      client.destroy();
    }
  }
  catch (error) {
    Logger.warn(`Failed to destroy webhook client: ${String(error)}`);
  }

  activeRuns.delete(channelId);
}

export async function startConversationRun(options: ConversationRunOptions) {
  const { channel, conversation } = options;

  if (activeRuns.has(channel.id)) {
    throw new ConversationAlreadyRunningError(channel.id);
  }

  const personaClients = await preparePersonaClients(
    channel,
    options.personaCatalog,
    conversation.personas,
    options.requestedBy
  );

  const abortController = new AbortController();
  const run: ConversationRunInternal = {
    personaClients,
    abortController,
    promise: Promise.resolve()
  };

  activeRuns.set(channel.id, run);

  const execute = async () => {
    try {
      for (let index = 0; index < conversation.events.length; index += 1) {
        if (abortController.signal.aborted) {
          throw new ConversationRunCancelledError();
        }

        const event = conversation.events[index];
        const persona = conversation.personas.get(event.personaId);
        if (!persona) {
          Logger.warn(
            `Skipping event ${index + 1}: persona ${event.personaId} no longer available`
          );
          continue;
        }

        if (index !== 0) {
          const delay = Math.max(options.delayMs, 500);
          await sleep(delay, undefined, { signal: abortController.signal });
        }

        if (abortController.signal.aborted) {
          throw new ConversationRunCancelledError();
        }

        const personaClient = personaClients.get(persona.id);
        if (!personaClient) {
          Logger.warn(
            `Skipping event ${index + 1}: no webhook client for persona ${persona.id}`
          );
          continue;
        }

        const rawMessage = await personaClient.client.send({
          content: event.content,
          username: persona.displayName,
          avatarURL: persona.avatarUrl
        });
        const sentMessage = rawMessage instanceof Message
          ? rawMessage
          : await channel.messages.fetch(rawMessage.id);

        await options.onMessage?.({
          eventIndex: index + 1,
          event,
          message: sentMessage
        });

        await options.onProgress?.({
          index: index + 1,
          total: conversation.events.length,
          personaId: persona.id,
          content: event.content
        });
      }

      await options.onFinish?.({
        channelId: channel.id,
        conversationName: conversation.name,
        completed: true
      });
    }
    catch (error) {
      const runError = error instanceof Error ? error : new Error(String(error));
      if (runError.name !== "ConversationRunCancelledError") {
        Logger.error(
          `Conversation "${conversation.name}" failed in channel ${channel.id}: ${runError.message}`
        );
      }

      await options.onFinish?.({
        channelId: channel.id,
        conversationName: conversation.name,
        completed: false,
        error: runError
      });

      throw runError;
    }
    finally {
      await cleanupRun(channel.id, run);
    }
  };

  run.promise = execute();
  return { promise: run.promise };
}

export function cancelConversationRun(channelId: string) {
  const run = activeRuns.get(channelId);
  if (!run) return false;

  run.abortController.abort();
  return true;
}

export function isConversationRunning(channelId: string) {
  return activeRuns.has(channelId);
}
