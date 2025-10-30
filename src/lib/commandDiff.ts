import { REST, Routes, Client } from "discord.js";
import { Logger } from "@core/logger";
import { AnyCommandHandler } from "@core/registry/command";

/**
 * Command diffing utility - only updates commands that have changed.
 * This reduces API calls and deployment time.
 *
 * Usage example in src/registry/events/ready/updateCommandAPI.ts:
 *
 * const differ = new CommandDiffer(client);
 * const diff = await differ.diff(cmdHandlers, { type: "global" });
 * await differ.apply(diff, { type: "global" });
 */

export type Scope = { type: "global" } | { type: "guild"; guildId: string };

interface RegisteredCommand {
  id: string;
  name: string;
  description: string;
  options?: any[];
  [key: string]: any;
}

interface CommandJson {
  name: string;
  description?: string; // Optional for context menu commands
  options?: any[];
  [key: string]: any;
}

export interface CommandDiff {
  toCreate: CommandJson[];
  toUpdate: Array<{ id: string; data: CommandJson }>;
  toDelete: Array<{ id: string; name: string }>;
}

export class CommandDiffer {
  private rest: REST;
  private clientId: string;

  constructor(client: Client) {
    if (!client.user) {
      throw new Error("Client must be ready before creating CommandDiffer");
    }
    this.clientId = client.user.id;
    this.rest = new REST({ version: "10" }).setToken(client.token!);
  }

  /**
   * Get the route for a given scope
   */
  private getRoute(scope: Scope) {
    if (scope.type === "guild") {
      return Routes.applicationGuildCommands(this.clientId, scope.guildId);
    }
    return Routes.applicationCommands(this.clientId);
  }

  /**
   * Fetch currently registered commands
   */
  private async fetchRegisteredCommands(scope: Scope): Promise<RegisteredCommand[]> {
    const route = this.getRoute(scope);
    const commands = await this.rest.get(route) as RegisteredCommand[];
    return commands;
  }

  /**
   * Compare two command objects to see if they're different
   */
  private commandsAreDifferent(local: CommandJson, remote: RegisteredCommand): boolean {
    // Compare name
    if (local.name !== remote.name) return true;

    // Compare description
    if (local.description !== remote.description) return true;

    // Compare options (simplified - you may want more detailed comparison)
    const localOptions = JSON.stringify(local.options ?? []);
    const remoteOptions = JSON.stringify(remote.options ?? []);

    return localOptions !== remoteOptions;
  }

  /**
   * Compute the diff between local commands and registered commands
   * This is a pure function with no side effects
   */
  async diff(
    localCommands: AnyCommandHandler[],
    scope: Scope
  ): Promise<CommandDiff> {
    const registeredCommands = await this.fetchRegisteredCommands(scope);
    const localCommandsJson: CommandJson[] = localCommands.map((cmd) =>
      cmd.data.toJSON?.() ?? cmd.data
    );

    const diff: CommandDiff = {
      toCreate: [],
      toUpdate: [],
      toDelete: []
    };

    // Find commands to create or update
    for (const localCmd of localCommandsJson) {
      const existingCmd = registeredCommands.find(
        (cmd) => cmd.name === localCmd.name
      );

      if (!existingCmd) {
        diff.toCreate.push(localCmd);
      }
      else if (this.commandsAreDifferent(localCmd, existingCmd)) {
        diff.toUpdate.push({ id: existingCmd.id, data: localCmd });
      }
    }

    // Find commands to delete (exist remotely but not locally)
    for (const registeredCmd of registeredCommands) {
      const stillExists = localCommandsJson.some(
        (cmd) => cmd.name === registeredCmd.name
      );

      if (!stillExists) {
        diff.toDelete.push({ id: registeredCmd.id, name: registeredCmd.name });
      }
    }

    return diff;
  }

  /**
   * Apply a computed diff to actually update the commands
   */
  async apply(diff: CommandDiff, scope: Scope): Promise<void> {
    const route = this.getRoute(scope);

    // Create new commands
    for (const cmd of diff.toCreate) {
      await this.rest.post(route, { body: cmd });
      Logger.debug(`  [+] Created: ${cmd.name}`);
    }

    // Update existing commands
    for (const { id, data } of diff.toUpdate) {
      await this.rest.patch(Routes.applicationCommand(this.clientId, id), {
        body: data
      });
      Logger.debug(`  [~] Updated: ${data.name}`);
    }

    // Delete removed commands
    for (const { id, name } of diff.toDelete) {
      await this.rest.delete(Routes.applicationCommand(this.clientId, id));
      Logger.debug(`  [-] Deleted: ${name}`);
    }
  }
}
