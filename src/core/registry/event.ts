import { ClientEvents } from "discord.js";

export type EventHandler<K extends keyof ClientEvents> = {
  execute: (...args: ClientEvents[K]) => Promise<any>;
  once?: boolean;
};

export type AnyEventHandler = {
  [K in keyof ClientEvents]: EventHandler<K>;
}[keyof ClientEvents];

export type EventHandlerGroup<K extends keyof ClientEvents> = EventHandler<K>[];

export type AnyEventHandlerGroup = EventHandler<keyof ClientEvents>[];

export type Event = {
  handlers: AnyEventHandlerGroup;
  name: keyof ClientEvents;
};

export function asHandlerOf<K extends keyof ClientEvents>(
  handler: AnyEventHandler
): EventHandler<K> {
  return handler as EventHandler<K>;
}
