import { Client } from "discord.js";
import { ScheduledTask, TaskContext } from "node-cron";
import { PrismaClient } from "@prisma/client";

export type TaskHandlerOptions = {
  client: Client;
  prisma: PrismaClient;
  context?: TaskContext;
};

/**
 * Scheduled task handler
 */
export type TaskHandler = {
  /**
   * Cron expression for task scheduling
   *
   * Format: second minute hour day month weekday
   * Examples:
   * - "0 0 * * *" - Every day at midnight
   * - "0 *\/15 * * *" - Every 15 minutes
   * - "0 0 * * 0" - Every Sunday at midnight
   * - "0 0 1 * *" - First day of every month at midnight
   */
  schedule: string;

  /**
   * Task name for logging
   */
  name?: string;

  /**
   * Execute the task
   */
  execute: (options: TaskHandlerOptions) => Promise<void>;

  /**
   * Whether to run immediately on startup (before first scheduled run)
   */
  runOnStart?: boolean;
};

export type Task = {
  handler: TaskHandler;
  name: string;
  scheduledTask?: ScheduledTask;
  nextRun?: Date;
};
