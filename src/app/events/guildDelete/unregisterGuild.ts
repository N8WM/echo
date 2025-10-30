import { Events } from "discord.js";

import { Logger } from "@core/logger";
import { EventHandler } from "@core/registry";
import { ServiceManager } from "@services";

const handler: EventHandler<Events.GuildDelete> = {
  async execute(guild) {
    Logger.debug(`Removed from guild "${guild.name}" <${guild.id}>`);

    await ServiceManager.guild.unregisterGuild(guild.id);
  }
};

export default handler;
