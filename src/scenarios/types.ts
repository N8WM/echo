export type ScenarioActorDefinition = {
  displayName: string;
  avatarUrl?: string;
};

export type ScenarioActor = ScenarioActorDefinition & {
  id: string;
};

export type ScenarioEvent = {
  actorId: string;
  content: string;
};

export type ScenarioFile = {
  name?: string;
  description?: string;
  actors: Record<string, ScenarioActorDefinition>;
  events: ScenarioEvent[];
};

export type LoadedScenario = {
  name: string;
  description?: string;
  actors: Map<string, ScenarioActor>;
  events: ScenarioEvent[];
};

export class ScenarioValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScenarioValidationError";
  }
}
