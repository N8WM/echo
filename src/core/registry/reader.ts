import { readdir, lstat } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import { Logger } from "@core/logger";

/**
 * Represents a file node in the directory tree.
 */
export type FileNode<T> = {
  name: string;
  parent: string;
  data: T;
};

const isDir = async (path: string): Promise<boolean> => {
  try {
    return (await lstat(path)).isDirectory();
  }
  catch {
    return false;
  }
};

const isJtsFile = (name: string): boolean => name.endsWith(".js") || name.endsWith(".ts");

/**
 * Recursively reads and processes files from a directory.
 * @param dir - The directory path to read
 * @param callback - Function called for each file found
 * @param depth - Current recursion depth (internal use)
 * @throws Error if directory doesn't exist or cannot be read
 */
export async function read<T>(
  dir: string,
  callback: (node: FileNode<T>, depth: number) => void,
  depth: number = 0
): Promise<void> {
  // Check if directory exists
  if (!existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  let entries: string[];
  try {
    entries = await readdir(dir);
  }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read directory ${dir}: ${message}`);
  }

  const entryData = await Promise.all(
    entries.map(async (name) => {
      const fpath = join(dir, name);
      const isDirResult = await isDir(fpath);
      return { name, fpath, isDir: isDirResult };
    })
  );

  const filtered = entryData.filter((item) => item.isDir || isJtsFile(item.name));

  const nodes = await Promise.all(
    filtered.map(async ({ name, fpath, isDir }) => {
      if (isDir) {
        // Recursively process subdirectories
        await read<T>(fpath, callback, depth + 1);
        return null;
      }

      // Import and process file
      try {
        const module = await import(fpath);
        return {
          isFile: true,
          name: name.replace(/\.(js|ts)$/, ""),
          parent: basename(dir),
          data: module.default as T
        };
      }
      catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        Logger.error(`Failed to import ${fpath}: ${message}`);
        return null;
      }
    })
  );

  // Process file nodes
  nodes
    .filter((node): node is FileNode<T> & { isFile: true } => node !== null && node.isFile)
    .forEach((node) => callback(node, depth));
}
