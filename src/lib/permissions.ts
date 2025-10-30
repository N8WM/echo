import { ChatInputCommandInteraction, PermissionsString } from "discord.js";
import { Logger } from "@core/logger";

/**
 * Checks if a member has the required permissions.
 * @param interaction - The command interaction
 * @param permissions - Required permissions
 * @returns True if the member has all required permissions
 */
export function hasPermissions(
  interaction: ChatInputCommandInteraction,
  permissions: PermissionsString[]
): boolean {
  if (!interaction.memberPermissions) {
    Logger.warn("Cannot check permissions: memberPermissions is null");
    return false;
  }

  const missingPermissions = permissions.filter(
    (perm) => !interaction.memberPermissions?.has(perm)
  );

  return missingPermissions.length === 0;
}

/**
 * Checks if the bot has the required permissions.
 * @param interaction - The command interaction
 * @param permissions - Required permissions
 * @returns True if the bot has all required permissions
 */
export function botHasPermissions(
  interaction: ChatInputCommandInteraction,
  permissions: PermissionsString[]
): boolean {
  if (!interaction.guild) {
    return false;
  }

  const botMember = interaction.guild.members.cache.get(
    interaction.client.user.id
  );

  if (!botMember) {
    Logger.warn("Cannot check bot permissions: bot member not found");
    return false;
  }

  const missingPermissions = permissions.filter(
    (perm) => !botMember.permissions.has(perm)
  );

  return missingPermissions.length === 0;
}

/**
 * Gets a list of missing permissions for a member.
 * @param interaction - The command interaction
 * @param permissions - Required permissions
 * @returns Array of missing permission names
 */
export function getMissingPermissions(
  interaction: ChatInputCommandInteraction,
  permissions: PermissionsString[]
): PermissionsString[] {
  if (!interaction.memberPermissions) {
    return permissions;
  }

  return permissions.filter(
    (perm) => !interaction.memberPermissions?.has(perm)
  );
}

/**
 * Gets a list of missing permissions for the bot.
 * @param interaction - The command interaction
 * @param permissions - Required permissions
 * @returns Array of missing permission names
 */
export function getBotMissingPermissions(
  interaction: ChatInputCommandInteraction,
  permissions: PermissionsString[]
): PermissionsString[] {
  if (!interaction.guild) {
    return permissions;
  }

  const botMember = interaction.guild.members.cache.get(
    interaction.client.user.id
  );

  if (!botMember) {
    return permissions;
  }

  return permissions.filter(
    (perm) => !botMember.permissions.has(perm)
  );
}
