declare global {
  namespace NodeJS {
    export interface ProcessEnv {
      TOKEN?: string;
      DEV_GUILD_IDS?: string;
      DISCORD_INTENTS?: string;
      DATABASE_URL?: string;
      SHADOW_DATABASE_URL?: string;
      OLLAMA_HOST?: string;
    }
  }
}

export { };
