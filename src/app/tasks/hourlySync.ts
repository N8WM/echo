import { TaskHandler } from "@core/registry/task";
import { Logger } from "@core/logger";
import { ServiceManager } from "@services";

/**
 * Hourly guild sync
 *
 * Syncs guild data with the database every hour.
 */

const handler: TaskHandler = {
  name: "Hourly Guild Sync",
  schedule: "0 0 * * * *", // Run every hour
  runOnStart: true, // Run on startup to ensure data is synced

  async execute({ client }) {
    try {
      const guildIds = client.guilds.cache.map((g) => g.id);
      await ServiceManager.guild.refreshGuilds(guildIds);
    }
    catch (error) {
      Logger.error(`Failed to sync guilds: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export default handler;
