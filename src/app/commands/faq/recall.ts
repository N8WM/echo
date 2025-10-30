import {
  ApplicationCommandType,
  ContainerBuilder,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
  TextDisplayBuilder
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { RecallSequence } from "@lib/llm";

const handler: CommandHandler<ApplicationCommandType.Message> = {
  type: ApplicationCommandType.Message,
  data: new ContextMenuCommandBuilder()
    .setName("Answer Question")
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild),

  async run({ interaction }) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const statusContainer = new ContainerBuilder();
    const componentLog: string[] = [];
    const rebuildComponentLog = (message: string, component: boolean) => {
      if (component) componentLog.push(message);

      return componentLog.length > 0
        ? [new TextDisplayBuilder().setContent("`" + componentLog.join(" ") + "`")]
        : [];
    };

    const update = async (message: string, component: boolean = false) => {
      if (!component) {
        statusContainer.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(message)
        );
      }

      await interaction.editReply({
        components: [statusContainer, ...rebuildComponentLog(message, component)],
        flags: [MessageFlags.IsComponentsV2]
      });
    };

    await update("Starting job...");

    const responseComponents = await RecallSequence.execute(
      interaction.targetMessage.content,
      interaction.targetMessage.createdAt,
      interaction.targetMessage.author.id,
      interaction.guildId!,
      update
    );

    if (responseComponents.length === 0) {
      responseComponents.push(
        new TextDisplayBuilder().setContent(`> ${interaction.targetMessage.content}\n`),
        new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent([
              "**No relevant topics were found. Try asking in chat!**\n",
              "\n",
              "-# The information required to answer this question has not yet been recorded. ",
              "To record a discussion topic, open the context menu on a related message using ",
              "right-click/long-press. Then select:\n-# `Apps > Remember Topic`"
            ].join(""))
          )
          .setAccentColor([255, 50, 50])
      );
    }

    await interaction.editReply({
      components: responseComponents,
      allowedMentions: { parse: [] },
      flags: [MessageFlags.IsComponentsV2]
    });
  }
};

export default handler;
