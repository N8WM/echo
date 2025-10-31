import { promises as fs } from "node:fs";
import path from "node:path";

import { Logger } from "@core/logger";

import {
  ConversationPersona,
  ConversationPersonaDefinition,
  ConversationPersonasFile,
  ConversationValidationError,
  ConversationFile,
  LoadedConversation
} from "./types";

const CONVERSATION_DIR = path.join(process.cwd(), "src", "conversations", "data");
const CONVERSATION_EXTENSION = ".json";
const PERSONA_FILENAME = "personas.json";
const PERSONA_FILE = path.join(CONVERSATION_DIR, PERSONA_FILENAME);

const conversationNamePattern = /^[a-z0-9\-]+$/i;
const maxPersonaCount = 10;

export type ConversationListItem = {
  name: string;
  description?: string;
};

type PersonaCache = {
  personas: Map<string, ConversationPersona>;
  list: ConversationPersona[];
};

let personaCache: PersonaCache | null = null;

async function readConversationFile(name: string) {
  if (`${name}${CONVERSATION_EXTENSION}` === PERSONA_FILENAME) {
    throw new ConversationValidationError("Reserved conversation name");
  }

  const filePath = path.join(CONVERSATION_DIR, `${name}${CONVERSATION_EXTENSION}`);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as ConversationFile;
}

async function ensureConversationDirectoryExists() {
  try {
    await fs.mkdir(CONVERSATION_DIR, { recursive: true });
  } catch (error) {
    Logger.error(`Failed to create conversation directory: ${String(error)}`);
    throw error;
  }
}

function validateConversationName(name: string) {
  if (!conversationNamePattern.test(name)) {
    throw new ConversationValidationError(
      `Invalid conversation name "${name}". Use alphanumeric characters and dashes only.`
    );
  }

  if (`${name}${CONVERSATION_EXTENSION}` === PERSONA_FILENAME) {
    throw new ConversationValidationError("Reserved conversation name");
  }
}

async function readPersonaFile(): Promise<ConversationPersonasFile> {
  const content = await fs.readFile(PERSONA_FILE, "utf8");
  return JSON.parse(content) as ConversationPersonasFile;
}

function validatePersonaDefinition(definition: ConversationPersonaDefinition, index: number) {
  if (!definition.id || !conversationNamePattern.test(definition.id)) {
    throw new ConversationValidationError(
      `Persona ${index + 1} has invalid id "${definition.id}". Use alphanumeric characters and dashes only.`
    );
  }

  if (!definition.displayName || definition.displayName.trim().length === 0) {
    throw new ConversationValidationError(`Persona ${definition.id} is missing a displayName`);
  }

  if (!definition.description || definition.description.trim().length === 0) {
    throw new ConversationValidationError(`Persona ${definition.id} is missing a description`);
  }
}

async function loadPersonasInternal(): Promise<PersonaCache> {
  await ensureConversationDirectoryExists();

  try {
    const file = await readPersonaFile();

    if (!Array.isArray(file.personas) || file.personas.length === 0) {
      throw new ConversationValidationError("Personas file must contain at least one persona");
    }

    if (file.personas.length > maxPersonaCount) {
      throw new ConversationValidationError(
        `Personas file defines ${file.personas.length} personas, exceeding the limit of ${maxPersonaCount}`
      );
    }

    const personaMap = new Map<string, ConversationPersona>();
    const displayNames = new Set<string>();

    file.personas.forEach((persona, index) => {
      validatePersonaDefinition(persona, index);

      if (personaMap.has(persona.id)) {
        throw new ConversationValidationError(`Duplicate persona id "${persona.id}" detected`);
      }

      if (displayNames.has(persona.displayName)) {
        throw new ConversationValidationError(
          `Duplicate persona display name "${persona.displayName}" detected`
        );
      }

      displayNames.add(persona.displayName);
      personaMap.set(persona.id, persona);
    });

    return {
      personas: personaMap,
      list: Array.from(personaMap.values())
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ConversationValidationError("Personas file was not found");
    }

    if (error instanceof ConversationValidationError) throw error;

    if (error instanceof SyntaxError) {
      throw new ConversationValidationError(
        `Personas file contains invalid JSON: ${error.message}`
      );
    }

    throw error;
  }
}

export async function getAllPersonas(): Promise<ConversationPersona[]> {
  if (!personaCache) {
    personaCache = await loadPersonasInternal();
  }

  return personaCache.list;
}

export async function getPersonaMap(): Promise<Map<string, ConversationPersona>> {
  if (!personaCache) {
    personaCache = await loadPersonasInternal();
  }

  return personaCache.personas;
}

export function clearPersonaCache() {
  personaCache = null;
}

function resolveConversation(
  file: ConversationFile,
  personaMap: Map<string, ConversationPersona>
): LoadedConversation {
  if (!file.name || file.name.trim().length === 0) {
    throw new ConversationValidationError("Conversation must include a name");
  }

  if (!Array.isArray(file.events) || file.events.length === 0) {
    throw new ConversationValidationError("Conversation must include at least one event");
  }

  const personas = new Map<string, ConversationPersona>();

  file.events.forEach((event, index) => {
    if (!event.personaId) {
      throw new ConversationValidationError(`Event ${index + 1} is missing a personaId`);
    }

    const persona = personaMap.get(event.personaId);
    if (!persona) {
      throw new ConversationValidationError(
        `Event ${index + 1} references unknown persona "${event.personaId}"`
      );
    }

    if (typeof event.content !== "string" || event.content.trim().length === 0) {
      throw new ConversationValidationError(`Event ${index + 1} has empty content`);
    }

    personas.set(persona.id, persona);
  });

  return {
    name: file.name,
    description: file.description,
    personas,
    events: file.events
  };
}

export async function listConversations(): Promise<ConversationListItem[]> {
  await ensureConversationDirectoryExists();

  const entries = await fs.readdir(CONVERSATION_DIR, { withFileTypes: true });
  const conversations: ConversationListItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(CONVERSATION_EXTENSION)) continue;
    if (entry.name === PERSONA_FILENAME) continue;
    const name = entry.name.slice(0, -CONVERSATION_EXTENSION.length);

    try {
      const file = await readConversationFile(name);
      conversations.push({
        name,
        description: file.description
      });
    } catch (error) {
      Logger.warn(`Skipping conversation ${entry.name}: ${String(error)}`);
    }
  }

  return conversations.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadConversation(name: string): Promise<LoadedConversation> {
  await ensureConversationDirectoryExists();
  validateConversationName(name);

  try {
    const personaMap = await getPersonaMap();
    const file = await readConversationFile(name);
    if (!file.name) file.name = name;
    return resolveConversation(file, personaMap);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ConversationValidationError(`Conversation "${name}" was not found`);
    }

    if (error instanceof ConversationValidationError) throw error;

    if (error instanceof SyntaxError) {
      throw new ConversationValidationError(
        `Conversation "${name}" contains invalid JSON: ${error.message}`
      );
    }

    throw error;
  }
}
