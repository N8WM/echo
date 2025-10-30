import { Events } from "discord.js";

import { Logger } from "@core/logger";
import { EventHandler } from "@core/registry";
import { ServiceManager } from "@services";

const handler: EventHandler<Events.ClientReady> = {
  async execute(client) {
    Logger.debug("Refreshing Guilds...");
    const guildIds = (await client.guilds.fetch()).map((g) => g.id);

    // Sync guilds: create new, update existing, delete removed
    const result = await ServiceManager.guild.refreshGuilds(guildIds);
    Logger.info(
      `Guild sync: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted`
    );
  },
  once: true
};

export default handler;
