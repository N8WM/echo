import { Client } from "discord.js";

export abstract class BaseInterface {
  constructor(protected readonly client: Client) { }
}
