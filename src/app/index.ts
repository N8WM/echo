import "dotenv/config";
import { Client } from "discord.js";

import config from "@config";
import { Logger } from "@core/logger";
import { Registry } from "@core/registry";
import { PrismaClient } from "@prisma/client";
import { ServiceManager } from "@services";
import { validateEnv } from "@core/config/env";
import { InterfaceManager, LLMSession } from "@lib/llm";

// Validate environment variables before starting
validateEnv();

// Instantiate database client
const prisma = new PrismaClient();

async function main() {
  // Instantiate discord client
  const client = new Client({
    intents: config.intents
  });

  await LLMSession.pullModel();
  InterfaceManager.init(client);

  // Initialize managers
  ServiceManager.init(prisma);

  // Set up Registry
  await Registry.init({
    client,
    prisma,
    token: config.token,
    commandsPath: config.paths.commands,
    eventsPath: config.paths.events,
    componentsPath: config.paths.components,
    tasksPath: config.paths.tasks,
    errorHandlersPath: config.paths.errorHandlers,
    devGuildIds: config.devGuildIds,
    healthCheck: config.healthCheck.enabled
      ? {
        enabled: true,
        port: config.healthCheck.port,
        prisma
      }
      : undefined
  });

  // Dispatch application
  await client.login(config.token);
}

// Graceful shutdown handler
async function shutdown(signal: string) {
  Logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await prisma.$disconnect();
    Logger.info("Database connection closed");
  }
  catch (error) {
    Logger.error(`Error during shutdown: ${error instanceof Error ? error.message : String(error)}`);
  }

  process.exit(0);
}

// Register shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  Logger.error(`Uncaught Exception: ${error.message}`);
  Logger.error(error.stack ?? "");
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  Logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
  if (reason instanceof Error) {
    Logger.error(reason.stack ?? "");
  }
  shutdown("unhandledRejection");
});

main()
  .catch((e) => {
    Logger.error(`Fatal error during startup:\n${e}`);
    shutdown("startup-error");
  });
