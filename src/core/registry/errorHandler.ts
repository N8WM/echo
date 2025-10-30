import {
  Client,
  CommandInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction
} from "discord.js";

import { Command } from "./command";

/**
 * Different contexts where errors can occur
 */
export type ErrorContext
  = | {
    type: "command";
    interaction: CommandInteraction;
    command: Command;
    client: Client;
  }
  | {
    type: "autocomplete";
    interaction: AutocompleteInteraction;
    command: Command;
    client: Client;
  }
  | {
    type: "component";
    interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction;
    componentId: string;
    client: Client;
  }
  | {
    type: "event";
    eventName: string;
    client: Client;
  }
  | {
    type: "middleware";
    interaction: CommandInteraction;
    middlewareName?: string;
    client: Client;
  }
  | {
      type: "task";
      taskName: string;
      client: Client;
    }
  | {
      type: "uncaught";
      client?: Client;
    };

/**
 * Error handler function type
 */
export type ErrorHandler = (error: Error, context: ErrorContext) => Promise<void>;

/**
 * Registry for error handlers
 */
export class ErrorHandlerRegistry {
  private static handlers = new Map<string, ErrorHandler>();
  private static globalHandler?: ErrorHandler;

  /**
   * Register an error handler for a specific context type
   */
  static register(contextType: ErrorContext["type"], handler: ErrorHandler): void {
    this.handlers.set(contextType, handler);
  }

  /**
   * Register a global error handler (catches all errors if no specific handler exists)
   */
  static registerGlobal(handler: ErrorHandler): void {
    this.globalHandler = handler;
  }

  /**
   * Handle an error with the appropriate handler
   */
  static async handle(error: Error, context: ErrorContext): Promise<void> {
    const handler = this.handlers.get(context.type) || this.globalHandler;

    if (handler) {
      try {
        await handler(error, context);
      }
      catch (handlerError) {
        // Error handler itself failed - log to console as fallback
        console.error("Error handler failed:", handlerError);
        console.error("Original error:", error);
      }
    }
    else {
      // No handler registered - log to console as fallback
      console.error(`Unhandled error in ${context.type} context:`, error);
    }
  }

  /**
   * Clear all registered handlers
   */
  static clear(): void {
    this.handlers.clear();
    this.globalHandler = undefined;
  }

  /**
   * Get all registered handler types
   */
  static getHandlerTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
