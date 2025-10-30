import { Client, ClientEvents, Collection, Events } from "discord.js";
import { PrismaClient } from "@prisma/client";

import { FileNode, read } from "./reader";
import { Logger, ind } from "@core/logger";
import { AnyCommandHandler, Command } from "./command";
import { AnyEventHandler, Event, EventHandler } from "./event";
import { ButtonHandler, ModalHandler, SelectMenuHandler, ComponentRegistry } from "./component";
import { TaskHandler } from "./task";
import { ErrorHandler, ErrorHandlerRegistry } from "./errorHandler";
import { TaskScheduler } from "@lib/scheduler";

export type RegistryOptions = {
  client: Client;
  prisma: PrismaClient;
  token: string;
  commandsPath: string;
  eventsPath: string;
  componentsPath?: string;
  tasksPath?: string;
  errorHandlersPath?: string;
  devGuildIds?: string[];
  devUserIds?: string[];
  devRoleIds?: string[];
  healthCheck?: {
    enabled: boolean;
    port?: number;
    prisma?: PrismaClient;
  };
};

export class Registry {
  private static _opts: RegistryOptions;
  private static _commands: Collection<string, Command>;
  private static _events: Collection<string, Event>;
  private static _taskScheduler?: TaskScheduler;

  static initialized = false;

  static get options() {
    return Registry._opts;
  }

  static get commands() {
    return Registry._commands;
  }

  static get events() {
    return Registry._events;
  }

  static get taskScheduler() {
    return Registry._taskScheduler;
  }

  static async init(options: RegistryOptions) {
    if (Registry.initialized) {
      Logger.warn("Registry should only be initialized once");
      return;
    }

    Registry._opts = options;
    Registry._commands = new Collection();
    Registry._events = new Collection();

    Logger.debug("Registering [E]vents, [C]ommands, C[O]mponents, [T]asks, and E[R]ror Handlers...");

    await Registry.registerEvents();
    await Registry.registerCommands();
    await Registry.registerComponents();
    await Registry.registerTasks();
    await Registry.registerErrorHandlers();

    Registry.initialized = true;
  }

  private static async registerCommands() {
    await read<AnyCommandHandler>(
      Registry._opts.commandsPath,
      (node, depth) => {
        const cname = node.data.data.name ?? node.name;
        const category = depth > 0 ? node.parent : undefined;

        if (!cname) {
          Logger.error(`Command registration error: command name is undefined for ${node.name}`);
          return;
        }

        Logger.debug(
          `${ind(1)}[C] ${cname.padEnd(25)} (${node.name})${category ? " <" + category + ">" : ""}`
        );

        Registry._commands.set(cname, {
          handler: node.data,
          name: cname,
          category
        });
      }
    );
  }

  private static async registerEvents() {
    const builtinHandlersPath = `${__dirname}/handlers`;

    await read<AnyEventHandler>(builtinHandlersPath, (node, depth) =>
      Registry.registerEvent(node, depth, true)
    );

    await read<AnyEventHandler>(
      Registry._opts.eventsPath,
      Registry.registerEvent
    );
  }

  private static registerEvent(
    node: FileNode<AnyEventHandler>,
    depth: number,
    builtin: boolean = false
  ) {
    const ename = node.parent as keyof ClientEvents;
    const ehandler = node.data as EventHandler<keyof ClientEvents>;

    const ereg = (
      ehandler.once ? Registry._opts.client.once : Registry._opts.client.on
    ).bind(Registry._opts.client);

    if (depth === 0 || !Object.values(Events).includes(ename as Events)) {
      Logger.error(
        `Event Registration Error: (${node.name}) Event must be within an event-named directory`
      );
      return;
    }

    Logger.debug(
      `${ind(1, builtin ? "*" : null)}[E] ${ename.padEnd(25)} (${node.name})`
    );

    const event = Registry._events.ensure(ename, () => ({
      name: ename,
      handlers: []
    }));

    event.handlers.push(ehandler);
    ereg(ename, (...args) => ehandler.execute(...args));
  }

  private static async registerComponents() {
    if (!Registry._opts.componentsPath) {
      Logger.debug("No components path provided, skipping component registration");
      return;
    }

    // Register buttons
    const buttonsPath = `${Registry._opts.componentsPath}/buttons`;
    try {
      await read<ButtonHandler>(buttonsPath, (node) => {
        const customId = node.name;
        Logger.debug(`${ind(1)}[O] ${customId.padEnd(25)} (${node.name}) <button>`);
        ComponentRegistry.registerButton(customId, node.data);
      });
    }
    catch {
      // Silently ignore if path doesn't exist
    }

    // Register modals
    const modalsPath = `${Registry._opts.componentsPath}/modals`;
    try {
      await read<ModalHandler>(modalsPath, (node) => {
        const customId = node.name;
        Logger.debug(`${ind(1)}[O] ${customId.padEnd(25)} (${node.name}) <modal>`);
        ComponentRegistry.registerModal(customId, node.data);
      });
    }
    catch {
      // Silently ignore if path doesn't exist
    }

    // Register select menus
    const selectsPath = `${Registry._opts.componentsPath}/selects`;
    try {
      await read<SelectMenuHandler>(selectsPath, (node) => {
        const customId = node.name;
        Logger.debug(`${ind(1)}[O] ${customId.padEnd(25)} (${node.name}) <select>`);
        ComponentRegistry.registerSelectMenu(customId, node.data);
      });
    }
    catch {
      // Silently ignore if path doesn't exist
    }
  }

  private static async registerTasks() {
    if (!Registry._opts.tasksPath) {
      Logger.debug("No tasks path provided, skipping task registration");
      return;
    }

    Registry._taskScheduler = new TaskScheduler(Registry._opts.client, Registry._opts.prisma);

    await read<TaskHandler>(Registry._opts.tasksPath, (node) => {
      const taskName = node.data.name ?? node.name;
      Logger.debug(`${ind(1)}[T] ${taskName.padEnd(25)} (${node.name})`);
      Registry._taskScheduler!.register(node.name, node.data);
    });
  }

  private static async registerErrorHandlers() {
    if (!Registry._opts.errorHandlersPath) {
      Logger.debug("No error handlers path provided, skipping error handler registration");
      return;
    }

    await read<ErrorHandler>(Registry._opts.errorHandlersPath, (node) => {
      const contextType = node.name;

      // Special case for global handler
      if (contextType === "global") {
        Logger.debug(`${ind(1)}[R] global (fallback)`);
        ErrorHandlerRegistry.registerGlobal(node.data);
      }
      else {
        Logger.debug(`${ind(1)}[R] ${contextType.padEnd(25)} (${node.name})`);
        ErrorHandlerRegistry.register(contextType as any, node.data);
      }
    });
  }
}
