import { Events } from "discord.js";

import { Logger } from "@core/logger";
import { EventHandler } from "@core/registry";
import { ServiceManager } from "@services";

/**
 * Register new guilds when the bot joins them
 */
const handler: EventHandler<Events.GuildCreate> = {
  async execute(guild) {
    Logger.info(`Joined guild: ${guild.name} (${guild.id})`);

    // Check if guild already exists
    const existing = await ServiceManager.guild.get(guild.id);

    if (existing) {
      Logger.debug(`Guild ${guild.name} already registered`);
      return;
    }

    try {
      await ServiceManager.guild.create(guild.id);
      Logger.debug(`Registered new guild ${guild.name} in database`);
    }
    catch (error) {
      Logger.error(`Failed to register guild ${guild.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

export default handler;
