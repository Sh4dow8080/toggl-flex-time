import { join } from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";

const APP_NAME = "toggl-flex-time";

/**
 * Returns the data directory for config and cache files.
 * - macOS/Linux: ~/.config/toggl-flex-time/
 * - Windows: %APPDATA%/toggl-flex-time/
 *
 * Creates the directory if it doesn't exist.
 */
export function getDataDir(): string {
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || join(homedir(), "AppData", "Roaming")
      : join(homedir(), ".config");

  const dir = join(base, APP_NAME);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  return dir;
}
