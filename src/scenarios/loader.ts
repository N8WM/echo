import { promises as fs } from "node:fs";
import path from "node:path";

import { Logger } from "@core/logger";

import {
  LoadedScenario,
  ScenarioActor,
  ScenarioFile,
  ScenarioValidationError
} from "./types";

const SCENARIO_DIR = path.join(process.cwd(), "src", "scenarios", "data");
const SCENARIO_EXTENSION = ".json";

const scenarioNamePattern = /^[a-z0-9\-]+$/i;

export type ScenarioListItem = {
  name: string;
  description?: string;
};

async function readScenarioFile(name: string) {
  const filePath = path.join(SCENARIO_DIR, `${name}${SCENARIO_EXTENSION}`);
  const content = await fs.readFile(filePath, "utf8");
  return JSON.parse(content) as ScenarioFile;
}

async function ensureScenarioDirectoryExists() {
  try {
    await fs.mkdir(SCENARIO_DIR, { recursive: true });
  } catch (error) {
    Logger.error(`Failed to create scenario directory: ${String(error)}`);
    throw error;
  }
}

function validateScenarioName(name: string) {
  if (!scenarioNamePattern.test(name)) {
    throw new ScenarioValidationError(
      `Invalid scenario name "${name}". Use alphanumeric characters and dashes only.`
    );
  }
}

function resolveScenario(file: ScenarioFile): LoadedScenario {
  if (!file.name || file.name.trim().length === 0) {
    throw new ScenarioValidationError("Scenario must include a name");
  }

  const actorEntries = Object.entries(file.actors ?? {});
  if (actorEntries.length === 0) {
    throw new ScenarioValidationError("Scenario must define at least one actor");
  }

  const actors = new Map<string, ScenarioActor>(
    actorEntries.map(([id, definition]) => [
      id,
      { id, displayName: definition.displayName, avatarUrl: definition.avatarUrl }
    ])
  );

  if (!Array.isArray(file.events) || file.events.length === 0) {
    throw new ScenarioValidationError("Scenario must include at least one event");
  }

  file.events.forEach((event, index) => {
    if (!event.actorId) {
      throw new ScenarioValidationError(`Event ${index + 1} is missing an actorId`);
    }

    if (!actors.has(event.actorId)) {
      throw new ScenarioValidationError(
        `Event ${index + 1} references unknown actor "${event.actorId}"`
      );
    }

    if (typeof event.content !== "string" || event.content.trim().length === 0) {
      throw new ScenarioValidationError(`Event ${index + 1} has empty content`);
    }
  });

  return {
    name: file.name,
    description: file.description,
    actors,
    events: file.events
  };
}

export async function listScenarios(): Promise<ScenarioListItem[]> {
  await ensureScenarioDirectoryExists();

  const entries = await fs.readdir(SCENARIO_DIR, { withFileTypes: true });
  const scenarios: ScenarioListItem[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(SCENARIO_EXTENSION)) continue;
    const name = entry.name.slice(0, -SCENARIO_EXTENSION.length);

    try {
      const file = await readScenarioFile(name);
      scenarios.push({
        name,
        description: file.description
      });
    } catch (error) {
      Logger.warn(`Skipping scenario ${entry.name}: ${String(error)}`);
    }
  }

  return scenarios.sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadScenario(name: string): Promise<LoadedScenario> {
  await ensureScenarioDirectoryExists();
  validateScenarioName(name);

  try {
    const file = await readScenarioFile(name);
    if (!file.name) file.name = name;
    return resolveScenario(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ScenarioValidationError(`Scenario "${name}" was not found`);
    }

    if (error instanceof ScenarioValidationError) throw error;

    if (error instanceof SyntaxError) {
      throw new ScenarioValidationError(
        `Scenario "${name}" contains invalid JSON: ${error.message}`
      );
    }

    throw error;
  }
}
