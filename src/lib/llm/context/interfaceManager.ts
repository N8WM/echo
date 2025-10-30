import { Client } from "discord.js";

import { Logger } from "@core/logger";

import { MessageInterface } from "./interfaces/messageInterface";

export class InterfaceManager {
  static messages: MessageInterface;

  static initialized = false;

  static init(client: Client) {
    if (InterfaceManager.initialized) {
      Logger.warn("InterfaceManager should only be initialized once");
      return;
    }

    InterfaceManager.messages = new MessageInterface(client);
    InterfaceManager.initialized = true;
  }
}
