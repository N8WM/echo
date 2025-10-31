export type ConversationPersonaDefinition = {
  id: string;
  displayName: string;
  avatarUrl?: string;
  description: string;
};

export type ConversationPersonasFile = {
  personas: ConversationPersonaDefinition[];
};

export type ConversationPersona = ConversationPersonaDefinition;

export type ConversationEvent = {
  personaId: string;
  content: string;
};

export type ConversationFile = {
  name?: string;
  description?: string;
  events: ConversationEvent[];
};

export type LoadedConversation = {
  name: string;
  description?: string;
  personas: Map<string, ConversationPersona>;
  events: ConversationEvent[];
};

export class ConversationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConversationValidationError";
  }
}
