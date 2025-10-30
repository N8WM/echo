import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  InteractionContextType
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
    await interaction.deferReply({ ephemeral: true });

    const stages: string[] = [];
    const update = async (message: string) => {
      stages.push(message);
      await interaction.editReply({ content: stages.join("\n") });
    };

    const result = await RecordSequence.execute(interaction.targetMessage, update);

    if (!result.ok) throw result.error;

    await update(`\nSummary:\n${result.value.summary}`);

    await interaction.followUp({
      content: "Topic recorded!",
      ephemeral: true
    });
  }
};

export default handler;
