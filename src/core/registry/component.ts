import {
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
  Client
} from "discord.js";

/**
 * Component interaction handler types
 */
export type ButtonHandler = {
  execute: (args: {
    interaction: ButtonInteraction;
    client: Client;
  }) => Promise<void>;
};

export type ModalHandler = {
  execute: (args: {
    interaction: ModalSubmitInteraction;
    client: Client;
  }) => Promise<void>;
};

export type SelectMenuHandler = {
  execute: (args: {
    interaction: AnySelectMenuInteraction;
    client: Client;
  }) => Promise<void>;
};

export type AnyComponentHandler = ButtonHandler | ModalHandler | SelectMenuHandler;

/**
 * Component handler registry for buttons, modals, and select menus
 */
export class ComponentRegistry {
  private static buttons = new Map<string, ButtonHandler>();
  private static modals = new Map<string, ModalHandler>();
  private static selectMenus = new Map<string, SelectMenuHandler>();

  /**
   * Register a button handler
   * @param customId - The button's custom ID (supports regex patterns)
   * @param handler - The handler function
   */
  static registerButton(customId: string, handler: ButtonHandler): void {
    this.buttons.set(customId, handler);
  }

  /**
   * Register a modal handler
   * @param customId - The modal's custom ID (supports regex patterns)
   * @param handler - The handler function
   */
  static registerModal(customId: string, handler: ModalHandler): void {
    this.modals.set(customId, handler);
  }

  /**
   * Register a select menu handler
   * @param customId - The select menu's custom ID (supports regex patterns)
   * @param handler - The handler function
   */
  static registerSelectMenu(customId: string, handler: SelectMenuHandler): void {
    this.selectMenus.set(customId, handler);
  }

  /**
   * Get a button handler by custom ID
   * @param customId - The button's custom ID
   * @returns The handler, or undefined if not found
   */
  static getButton(customId: string): ButtonHandler | undefined {
    // Try exact match first
    if (this.buttons.has(customId)) {
      return this.buttons.get(customId);
    }

    // Try regex patterns
    for (const [pattern, handler] of this.buttons.entries()) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(customId)) {
          return handler;
        }
      }
      catch {
        // Not a valid regex, skip
        continue;
      }
    }

    return undefined;
  }

  /**
   * Get a modal handler by custom ID
   * @param customId - The modal's custom ID
   * @returns The handler, or undefined if not found
   */
  static getModal(customId: string): ModalHandler | undefined {
    if (this.modals.has(customId)) {
      return this.modals.get(customId);
    }

    for (const [pattern, handler] of this.modals.entries()) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(customId)) {
          return handler;
        }
      }
      catch {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Get a select menu handler by custom ID
   * @param customId - The select menu's custom ID
   * @returns The handler, or undefined if not found
   */
  static getSelectMenu(customId: string): SelectMenuHandler | undefined {
    if (this.selectMenus.has(customId)) {
      return this.selectMenus.get(customId);
    }

    for (const [pattern, handler] of this.selectMenus.entries()) {
      try {
        const regex = new RegExp(pattern);
        if (regex.test(customId)) {
          return handler;
        }
      }
      catch {
        continue;
      }
    }

    return undefined;
  }

  /**
   * Clear all registered component handlers
   */
  static clear(): void {
    this.buttons.clear();
    this.modals.clear();
    this.selectMenus.clear();
  }
}
