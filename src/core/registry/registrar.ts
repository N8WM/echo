import { Client, REST, Routes } from "discord.js";

import { Logger, ind } from "@core/logger";
import { AnyCommandHandler } from "./command";
import { Registry } from "./registry";

export type Scope = { type: "global" } | { type: "guild"; guildId: string };

export class CommandRegistrar {
  private _clientId: string;
  private _rest: REST;

  constructor(client: Client) {
    if (!client.isReady()) {
      throw new Error("Cannot update API before the client is ready");
    }

    this._clientId = client.user.id;
    this._rest = new REST({ version: "10" }).setToken(Registry.options.token);
  }

  private getCommandJSON(cmd: AnyCommandHandler) {
    return cmd.data.toJSON?.() ?? cmd.data;
  }

  private getRoute(scope: Scope) {
    if (scope.type === "guild") {
      return {
        path: Routes.applicationGuildCommands(this._clientId, scope.guildId),
        label: `GUILD application commands (for <${scope.guildId}>)`
      };
    }
    return {
      path: Routes.applicationCommands(this._clientId),
      label: `GLOBAL application commands`
    };
  }

  async register(commands: AnyCommandHandler[], scope: Scope) {
    const data = commands.map(this.getCommandJSON);
    const route = this.getRoute(scope);

    const updateOne = async (cmd: ReturnType<typeof this.getCommandJSON>) => {
      let failed = false;

      await this._rest.post(route.path, { body: cmd }).catch((e: Error) => {
        failed = true;
        Logger.error(`${ind(2)}[X] ${cmd.name}\n${e}`);
      });

      return failed ? 1 : 0;
    };

    const success = (res: unknown) => {
      const count = Array.isArray(res) ? res.length : 0;
      Logger.debug(`${ind(1)}[/] Updated ${count} ${route.label}`);
    };

    const failure = async (err: Error) => {
      Logger.error(`${ind(1)}[/] Failed to bulk-update ${route.label}`);
      const failures = (await Promise.all(data.map(updateOne))) as number[];
      const failureCount = failures.reduce((acc, curr) => acc + curr, 0);
      if (failureCount === 0)
        Logger.error(`${ind(2)} All commands updated; initial error:\n${err}`);
    };

    await this._rest
      .put(route.path, { body: data })
      .then(success)
      .catch(failure);
  }
}
