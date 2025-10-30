import { GatewayIntentBits } from "discord.js";
import { requireEnv, parseEnvArray } from "@core/config/env";
import { resolveAppPath } from "@core/config/paths";

/**
 * Default Discord intents if none are specified
 */
const DEFAULT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.GuildMessageReactions,
  GatewayIntentBits.GuildModeration,
  GatewayIntentBits.MessageContent
];

/**
 * Parse intents from environment variable
 */
function parseIntents(): number[] {
  const intentNames = parseEnvArray("DISCORD_INTENTS");

  if (intentNames.length === 0) {
    return DEFAULT_INTENTS;
  }

  return intentNames.map((name) => {
    const intent = GatewayIntentBits[name as keyof typeof GatewayIntentBits];
    if (intent === undefined) {
      throw new Error(`Invalid Discord intent: ${name}`);
    }
    return intent;
  });
}

const config = {
  token: requireEnv("TOKEN"),
  devGuildIds: parseEnvArray("DEV_GUILD_IDS"),
  databaseUrl: requireEnv("DATABASE_URL"),
  intents: parseIntents(),
  paths: {
    commands: resolveAppPath("commands"),
    events: resolveAppPath("events"),
    components: resolveAppPath("components"),
    tasks: resolveAppPath("tasks"),
    errorHandlers: resolveAppPath("errorHandlers")
  },
  healthCheck: {
    enabled: process.env["ENABLE_HEALTH_CHECK"] === "true",
    port: parseInt(requireEnv("HEALTH_CHECK_PORT", "3000"))
  }
};

export default config;
