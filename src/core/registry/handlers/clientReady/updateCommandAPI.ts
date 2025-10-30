import { Events } from "discord.js";

import { Logger } from "@core/logger";

import { EventHandler } from "../../event";
import { CommandRegistrar } from "../../registrar";
import { Registry } from "../../registry";
import { CommandDiffer } from "@lib/commandDiff";
import { HealthChecker } from "@lib/healthCheck";

const USE_SMART_DEPLOYMENT = process.env["USE_SMART_COMMAND_DEPLOYMENT"] === "true";

const handler: EventHandler<Events.ClientReady> = {
  async execute(client) {
    Logger.info(`${client.user.username} is online`);
    Logger.debug("Updating Application [/] Command API...");

    const registrar = new CommandRegistrar(client);
    const commands = Array.from(Registry.commands.values());
    const cmdHandlers = commands
      .map((c) => c.handler)
      .filter((c) => !c.options?.deleted);

    const globalCmds = cmdHandlers.filter((c) => !c.options?.devOnly);
    const guildCmds = cmdHandlers.filter((c) => c.options?.devOnly);

    if (USE_SMART_DEPLOYMENT) {
      Logger.debug("Using smart command deployment (only updates changed commands)");

      const differ = new CommandDiffer(client);
      const globalDiff = await differ.diff(globalCmds, { type: "global" });
      const guildDiffs = await Promise.all(
        (Registry.options.devGuildIds ?? []).map(async (id) => ({
          guildId: id,
          diff: await differ.diff(guildCmds, { type: "guild", guildId: id })
        }))
      );

      Logger.debug(`Global: +${globalDiff.toCreate.length} ~${globalDiff.toUpdate.length} -${globalDiff.toDelete.length}`);
      guildDiffs.forEach(({ guildId, diff }) => {
        Logger.debug(`Guild ${guildId}: +${diff.toCreate.length} ~${diff.toUpdate.length} -${diff.toDelete.length}`);
      });

      await differ.apply(globalDiff, { type: "global" });
      await Promise.all(
        guildDiffs.map(({ guildId, diff }) =>
          differ.apply(diff, { type: "guild", guildId })
        )
      );
    }
    else {
      const regGuildCmds = async (id: string) =>
        await registrar.register(guildCmds, { type: "guild", guildId: id });

      await registrar.register(globalCmds, { type: "global" });
      await Promise.all(Registry.options.devGuildIds?.map(regGuildCmds) ?? []);
    }

    // Start task scheduler if tasks were registered
    if (Registry.taskScheduler) {
      Logger.debug("Starting task scheduler...");
      await Registry.taskScheduler.start();
    }

    // Start health check server if enabled
    if (Registry.options.healthCheck?.enabled) {
      const port = Registry.options.healthCheck.port ?? 3000;
      const prisma = Registry.options.healthCheck.prisma;

      if (!prisma) {
        Logger.warn("Health check enabled but no Prisma client provided, skipping health check setup");
      }
      else {
        Logger.debug("Starting health check server...");
        const healthChecker = new HealthChecker(client, prisma);

        const http = require("http");
        const server = http.createServer(async (req: any, res: any) => {
          if (req.url === "/health") {
            const status = await healthChecker.check();
            res.statusCode = status.status === "healthy" ? 200 : 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(status, null, 2));
          }
          else if (req.url === "/ready") {
            const isReady = await healthChecker.isHealthy();
            res.statusCode = isReady ? 200 : 503;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ready: isReady }));
          }
          else {
            res.statusCode = 404;
            res.end("Not Found");
          }
        });

        server.listen(port, () => {
          Logger.info(`Health check endpoints available at http://localhost:${port}/health and /ready`);
        });
      }
    }

    Logger.info(`Ready!`);
  },
  once: true
};

export default handler;
