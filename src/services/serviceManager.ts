import { Logger } from "@core/logger";
import { PrismaClient } from "@prisma/client";

import { GuildService } from "./guildService";
import { TopicService } from "./topicService";

export class ServiceManager {
  static guild: GuildService;
  static topic: TopicService;

  static initialized = false;

  static init(prisma: PrismaClient) {
    if (ServiceManager.initialized) {
      Logger.warn("ServiceManager should only be initialized once");
      return;
    }

    ServiceManager.guild = new GuildService(prisma);
    ServiceManager.topic = new TopicService(prisma);

    ServiceManager.initialized = true;
  }
}
