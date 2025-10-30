import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Gets the directory path for the current module.
 * Works in both development (TS) and production (JS) environments.
 *
 * @param importMetaUrl - Pass `import.meta.url` for ESM or use __dirname for CommonJS
 * @returns The directory path
 */
export function getDirname(importMetaUrl?: string): string {
  if (importMetaUrl) {
    // ESM module
    return dirname(fileURLToPath(importMetaUrl));
  }
  // CommonJS fallback
  return __dirname;
}

/**
 * Resolves a path relative to the app directory.
 * In development, this is the src/app/ directory.
 * In production, this is the dist/app/ directory.
 *
 * @param relativePath - Path relative to the app directory
 * @returns Absolute path
 */
export function resolveAppPath(relativePath: string): string {
  // __dirname is src/core/config or dist/core/config
  // We need to go up to src/ or dist/, then into app/
  return join(__dirname, "..", "..", "app", relativePath);
}
