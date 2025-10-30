import {
  ApplicationCommandType,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder
} from "discord.js";

import { CommandHandlerInteraction } from "@core/registry";

export function build(
  interaction: CommandHandlerInteraction<ApplicationCommandType.ChatInput>
) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent("# 🏓 Pong!"))
    .addSeparatorComponents(
      new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true)
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Pong Latency: \`${Math.max(0, Date.now() - interaction.createdTimestamp)}ms\``
      ),
      new TextDisplayBuilder().setContent(
        "API Latency: "
        + (interaction.client.ws.ping < 0
          ? "`calculating`"
          : "`" + interaction.client.ws.ping + "ms`")
      )
    );
}
