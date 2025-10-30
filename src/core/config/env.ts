/**
 * Validates that a required environment variable exists and is non-empty.
 * @param key - The environment variable name
 * @param defaultValue - Optional default value if not set
 * @returns The environment variable value
 * @throws Error if the variable is missing and no default is provided
 */
export function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (value === undefined || value === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(
      `Missing required environment variable: ${key}\n`
      + `Please set ${key} in your .env file or environment.`
    );
  }

  return value;
}

/**
 * Parses a comma-separated list from an environment variable.
 * @param key - The environment variable name
 * @param defaultValue - Optional default array if not set
 * @returns Array of trimmed, non-empty strings
 */
export function parseEnvArray(key: string, defaultValue: string[] = []): string[] {
  const value = process.env[key];

  if (value === undefined || value === "") {
    return defaultValue;
  }

  return value
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
}

/**
 * Validates all required environment variables for the application.
 * Call this early in the application lifecycle.
 * @throws Error if any required variables are missing
 */
export function validateEnv(): void {
  const required = ["TOKEN", "DATABASE_URL"];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key] === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n`
      + missing.map((k) => `  - ${k}`).join("\n")
      + `\n\nPlease check your .env file.`
    );
  }
}
