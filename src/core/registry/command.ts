import {
  Client,
  PermissionsString,
  SlashCommandBuilder,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  ChatInputCommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  UserContextMenuCommandInteraction,
  SlashCommandSubcommandsOnlyBuilder,
  PrimaryEntryPointCommandInteraction,
  MessageContextMenuCommandInteraction,
  AutocompleteInteraction
} from "discord.js";

import { Middleware } from "./middleware";

type CommandTypeMap = {
  [ApplicationCommandType.ChatInput]: {
    interaction: ChatInputCommandInteraction;
    builder:
      | SlashCommandBuilder
      | SlashCommandSubcommandsOnlyBuilder
      | SlashCommandOptionsOnlyBuilder;
  };
  [ApplicationCommandType.User]: {
    interaction: UserContextMenuCommandInteraction;
    builder: ContextMenuCommandBuilder;
  };
  [ApplicationCommandType.Message]: {
    interaction: MessageContextMenuCommandInteraction;
    builder: ContextMenuCommandBuilder;
  };
  [ApplicationCommandType.PrimaryEntryPoint]: {
    interaction: PrimaryEntryPointCommandInteraction;
    builder: ContextMenuCommandBuilder;
  };
};

export type CommandHandlerInteraction<T extends ApplicationCommandType>
  = CommandTypeMap[T]["interaction"];

export type CommandHandlerOptions = {
  devOnly?: boolean;
  userPermissions?: PermissionsString[];
  botPermissions?: PermissionsString[];
  deleted?: boolean;
  middleware?: Middleware[];
};

export type CommandHandler<T extends ApplicationCommandType> = {
  type: T;
  data: CommandTypeMap[T]["builder"];
  run: (args: {
    interaction: CommandTypeMap[T]["interaction"];
    client: Client;
  }) => Promise<void>;
  autocomplete?: T extends ApplicationCommandType.ChatInput
    ? (args: {
        interaction: AutocompleteInteraction;
        client: Client;
      }) => Promise<void>
    : never;
  options?: CommandHandlerOptions;
};

export type AnyCommandHandler
  = | CommandHandler<ApplicationCommandType.ChatInput>
    | CommandHandler<ApplicationCommandType.User>
    | CommandHandler<ApplicationCommandType.Message>
    | CommandHandler<ApplicationCommandType.PrimaryEntryPoint>;

export type Command = {
  handler: AnyCommandHandler;
  name: string;
  category?: string;
};
