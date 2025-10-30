import {
  ApplicationCommandType,
  ContainerBuilder,
  MessageFlags,
  RGBTuple,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";

import { CommandHandlerInteraction } from "@core/registry";

export type Status = {
  Success: "Success";
  Failed: "Failed";
};

const colorMap: Map<keyof Status, RGBTuple> = new Map([
  ["Success", [0, 255, 0]],
  ["Failed", [255, 0, 0]]
]);

export function build(options: {
  status: keyof Status;
  operation: string;
  message?: string;
}) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# *${options.operation}*\n## ${options.status}`
      )
    )
    .setAccentColor(colorMap.get(options.status));

  if (options.message) {
    container
      .addSeparatorComponents(
        new SeparatorBuilder()
          .setDivider(true)
          .setSpacing(SeparatorSpacingSize.Small)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(options.message)
      );
  }

  return container;
}

export async function reply<T extends ApplicationCommandType>(
  interaction: CommandHandlerInteraction<T>,
  options: { status: keyof Status; operation: string; message?: string }
) {
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      components: [build(options)],
      flags: [MessageFlags.IsComponentsV2]
    });
  }
  else {
    await interaction.reply({
      components: [build(options)],
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral]
    });
  }
}
