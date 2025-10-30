import { ChatInputCommandInteraction, Client } from "discord.js";

/**
 * Middleware result - either continue or stop with an error message
 */
export type MiddlewareResult
  = | { continue: true }
    | { continue: false; error: string };

/**
 * Middleware function type
 */
export type Middleware = (args: {
  interaction: ChatInputCommandInteraction;
  client: Client;
}) => Promise<MiddlewareResult> | MiddlewareResult;

/**
 * Collection of built-in middleware functions
 */
export const builtinMiddleware = {
  /**
   * Ensures the command is only run in a guild (server)
   */
  guildOnly: (): Middleware => {
    return ({ interaction }) => {
      if (!interaction.guild) {
        return {
          continue: false,
          error: "This command can only be used in a server."
        };
      }
      return { continue: true };
    };
  },

  /**
   * Ensures the command is only run in DMs
   */
  dmOnly: (): Middleware => {
    return ({ interaction }) => {
      if (interaction.guild) {
        return {
          continue: false,
          error: "This command can only be used in direct messages."
        };
      }
      return { continue: true };
    };
  },

  /**
   * Simple cooldown middleware
   * @param seconds - Cooldown duration in seconds
   */
  cooldown: (seconds: number): Middleware => {
    const cooldowns = new Map<string, number>();

    return ({ interaction }) => {
      const key = `${interaction.user.id}-${interaction.commandName}`;
      const now = Date.now();
      const cooldownEnd = cooldowns.get(key);

      if (cooldownEnd && now < cooldownEnd) {
        const remaining = Math.ceil((cooldownEnd - now) / 1000);
        return {
          continue: false,
          error: `Please wait ${remaining} more second(s) before using this command again.`
        };
      }

      cooldowns.set(key, now + seconds * 1000);

      // Clean up old cooldowns
      setTimeout(() => cooldowns.delete(key), seconds * 1000);

      return { continue: true };
    };
  },

  /**
   * Requires user to have specific role(s)
   * @param roleIds - Array of role IDs (user must have at least one)
   */
  requireRole: (...roleIds: string[]): Middleware => {
    return ({ interaction }) => {
      if (!interaction.guild || !interaction.member) {
        return {
          continue: false,
          error: "This command can only be used in a server."
        };
      }

      const memberRoles = interaction.member.roles;
      const hasRole = roleIds.some((roleId) =>
        Array.isArray(memberRoles)
          ? memberRoles.includes(roleId)
          : memberRoles.cache.has(roleId)
      );

      if (!hasRole) {
        return {
          continue: false,
          error: "You don't have the required role to use this command."
        };
      }

      return { continue: true };
    };
  },

  /**
   * Only allows specific users to run the command
   * @param userIds - Array of user IDs
   */
  requireUser: (...userIds: string[]): Middleware => {
    return ({ interaction }) => {
      if (!userIds.includes(interaction.user.id)) {
        return {
          continue: false,
          error: "You don't have permission to use this command."
        };
      }
      return { continue: true };
    };
  }
};
