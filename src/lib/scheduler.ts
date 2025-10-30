import cron from "node-cron";

import { Client } from "discord.js";
import { PrismaClient } from "@prisma/client";

import { Logger } from "@core/logger";
import { Task, TaskHandler } from "@core/registry/task";

/**
 * Simple task scheduler
 * Supports cron expressions
 */
export class TaskScheduler {
  private tasks: Map<string, Task> = new Map();
  private client: Client;
  private prisma: PrismaClient;

  constructor(client: Client, prisma: PrismaClient) {
    this.client = client;
    this.prisma = prisma;
  }

  /**
   * Register a new scheduled task
   */
  register(name: string, handler: TaskHandler): void {
    const task: Task = {
      handler,
      name: handler.name || name
    };

    this.tasks.set(name, task);
  }

  /**
   * Start all registered tasks
   */
  async start(): Promise<void> {
    for (const [, task] of this.tasks.entries()) {
      try {
        if (!cron.validate(task.handler.schedule)) {
          Logger.warn(`Syntax error in cron task ${task.name}, skipping`);
          continue;
        }

        task.scheduledTask = cron.schedule(
          task.handler.schedule,
          async (context) => {
            try {
              Logger.debug(`Running scheduled task: ${task.name}`);
              await task.handler.execute({
                client: this.client,
                prisma: this.prisma,
                context
              });
            }
            catch (error) {
              Logger.error(`Error in scheduled task ${task.name}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
        );

        Logger.debug(`Scheduled task ${task.name} (next run: ${task.scheduledTask?.getNextRun()?.toLocaleString()})`);

        if (task.handler.runOnStart) {
          Logger.debug(`Running task on startup: ${task.name}`);
          await task.scheduledTask.execute();
        }
      }
      catch (error) {
        Logger.error(`Failed to schedule task ${task.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Stop all running tasks
   */
  stop(): void {
    for (const task of this.tasks.values()) {
      if (task.scheduledTask) {
        task.scheduledTask.destroy();
      }
    }
    Logger.info("All scheduled tasks stopped");
  }

  /**
   * Get all registered tasks
   */
  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
}
