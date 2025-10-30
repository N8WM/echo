import { Snowflake } from "discord.js";
import type { Guild as GuildRecord } from "@prisma/client";

import { Result } from "@lib/result";
import { BaseService } from "./baseService";

export enum GuildStatus {
  Success = "Success",
  SnowflakeAlreadyExists = "This server is already registered",
  SnowflakeDoesNotExist = "This server is not registered"
}

export class GuildService extends BaseService {
  async get(snowflake: Snowflake) {
    return await this.prisma.guild.findUnique({ where: { snowflake } });
  }

  async create(snowflake: Snowflake) {
    return await this.prisma.guild.upsert({
      where: { snowflake },
      create: { snowflake },
      update: {}
    });
  }

  async refreshGuilds(snowflakes: Snowflake[]) {
    const deleted = await this.prisma.guild.deleteMany({
      where: { snowflake: { notIn: snowflakes } }
    });

    const existing = await this.prisma.guild.findMany({
      where: { snowflake: { in: snowflakes } },
      select: { snowflake: true }
    });

    const existingIds = new Set(existing.map((g) => g.snowflake));
    const newGuildIds = snowflakes.filter((id) => !existingIds.has(id));

    if (newGuildIds.length > 0) {
      await this.prisma.guild.createMany({
        data: newGuildIds.map((snowflake) => ({ snowflake }))
      });
    }

    const updated = await this.prisma.guild.updateMany({
      where: { snowflake: { in: snowflakes } },
      data: { updatedAt: new Date() }
    });

    return {
      created: newGuildIds.length,
      updated: updated.count,
      deleted: deleted.count
    };
  }

  async unregisterGuild(
    snowflake: Snowflake
  ): Promise<Result<GuildRecord, GuildStatus>> {
    const existing = await this.get(snowflake);

    if (!existing) {
      return Result.err(GuildStatus.SnowflakeDoesNotExist);
    }

    const guild = await this.prisma.guild.delete({ where: { snowflake } });
    return Result.ok(guild);
  }
}
