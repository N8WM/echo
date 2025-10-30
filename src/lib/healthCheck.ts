import { Client } from "discord.js";
import { PrismaClient } from "@prisma/client";
import { Logger } from "@core/logger";

/**
 * Health check utility for monitoring bot status.
 * Useful for deployment platforms that need health endpoints.
 */

export interface HealthStatus {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  checks: {
    discord: {
      connected: boolean;
      ping: number;
      guilds: number;
    };
    database: {
      connected: boolean;
      responseTime?: number;
      error?: string;
    };
  };
}

export class HealthChecker {
  private client: Client;
  private prisma: PrismaClient;
  private startTime: number;

  constructor(client: Client, prisma: PrismaClient) {
    this.client = client;
    this.prisma = prisma;
    this.startTime = Date.now();
  }

  /**
   * Check if Discord client is connected and healthy
   */
  private async checkDiscord(): Promise<HealthStatus["checks"]["discord"]> {
    const connected = this.client.isReady();
    const ping = connected ? this.client.ws.ping : -1;
    const guilds = connected ? this.client.guilds.cache.size : 0;

    return { connected, ping, guilds };
  }

  /**
   * Check if database is accessible
   */
  private async checkDatabase(): Promise<HealthStatus["checks"]["database"]> {
    const start = Date.now();

    try {
      // Simple query to check connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        connected: true,
        responseTime
      };
    }
    catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Perform full health check
   */
  async check(): Promise<HealthStatus> {
    const [discord, database] = await Promise.all([
      this.checkDiscord(),
      this.checkDatabase()
    ]);

    const isHealthy = discord.connected && database.connected;

    const status: HealthStatus = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks: {
        discord,
        database
      }
    };

    if (!isHealthy) {
      Logger.warn(`Health check failed: ${JSON.stringify(status)}`);
    }

    return status;
  }

  /**
   * Simple boolean health check
   */
  async isHealthy(): Promise<boolean> {
    const status = await this.check();
    return status.status === "healthy";
  }
}

/**
 * Example: Set up periodic health checks
 *
 * const healthChecker = new HealthChecker(client, prisma);
 *
 * setInterval(async () => {
 *   const status = await healthChecker.check();
 *   if (status.status === "unhealthy") {
 *     Logger.error("Bot is unhealthy:", status);
 *     // Send alert, restart, etc.
 *   }
 * }, 60000); // Check every minute
 */

/**
 * Example: HTTP health endpoint with Express
 *
 * import express from "express";
 * const app = express();
 *
 * app.get("/health", async (req, res) => {
 *   const healthChecker = new HealthChecker(client, prisma);
 *   const status = await healthChecker.check();
 *
 *   res
 *     .status(status.status === "healthy" ? 200 : 503)
 *     .json(status);
 * });
 *
 * app.listen(3000);
 */
