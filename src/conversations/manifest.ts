import manifestJson from "./data/seed.manifest.json";

export type ConversationManifestEntry = {
  /**
   * Name of the conversation file (without .json extension)
   */
  name: string;

  /**
   * Guild text channel where the conversation should be replayed.
   * If the channel does not exist, it will be created.
   */
  channel: string;

  /**
   * Optional delay override in milliseconds between messages for this conversation.
   */
  delayMs?: number;

  /**
   * 1-based indexes of events within the conversation that should be recorded
   * via the Remember Topic workflow.
   */
  recordMessages?: number[];
};

export function getConversationManifest(): ConversationManifestEntry[] {
  return manifestJson as ConversationManifestEntry[];
}
