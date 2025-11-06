import {
  ApplicationCommandType,
  ContainerBuilder,
  ContextMenuCommandBuilder,
  InteractionContextType,
  MessageFlags,
  TextDisplayBuilder
} from "discord.js";

import { CommandHandler } from "@core/registry";
import { RecordSequence } from "@lib/llm";

const handler: CommandHandler<ApplicationCommandType.Message> = {
  type: ApplicationCommandType.Message,
  data: new ContextMenuCommandBuilder()
    .setName("Remember Topic")
    .setType(ApplicationCommandType.Message)
    .setContexts(InteractionContextType.Guild),

  async run({ interaction }) {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });
    let label = new TextDisplayBuilder().setContent(`***Thinking...***`);

    const update = async (message: string) => {
      label = new TextDisplayBuilder().setContent(`***${message}***`);

      await interaction.editReply({
        components: [label],
        flags: [MessageFlags.IsComponentsV2]
      });
    };

    const result = await RecordSequence.execute(interaction.targetMessage, update);
    const summary = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Summary**\n*${result.summary}*`));

    await interaction.editReply({
      components: [label, summary]
    });
  }
};

export default handler;
