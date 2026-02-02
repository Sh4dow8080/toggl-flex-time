import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface Config {
  togglApiToken: string;
  workspaceId: number;
  hoursPerWeek: number;
  hoursPerDay: number;
  customHolidays: string[];
}

const CONFIG_FILE = "config.json";

function validateConfig(config: unknown): config is Config {
  if (typeof config !== "object" || config === null) {
    return false;
  }

  const c = config as Record<string, unknown>;

  if (typeof c.togglApiToken !== "string" || c.togglApiToken.length === 0) {
    throw new Error("togglApiToken must be a non-empty string");
  }

  if (typeof c.workspaceId !== "number" || !Number.isInteger(c.workspaceId)) {
    throw new Error("workspaceId must be an integer");
  }

  if (typeof c.hoursPerWeek !== "number" || c.hoursPerWeek <= 0) {
    throw new Error("hoursPerWeek must be a positive number");
  }

  if (typeof c.hoursPerDay !== "number" || c.hoursPerDay <= 0) {
    throw new Error("hoursPerDay must be a positive number");
  }

  if (!Array.isArray(c.customHolidays)) {
    throw new Error("customHolidays must be an array");
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  for (const holiday of c.customHolidays) {
    if (typeof holiday !== "string" || !dateRegex.test(holiday)) {
      throw new Error(
        `Invalid date format in customHolidays: ${holiday}. Expected YYYY-MM-DD`
      );
    }
  }

  return true;
}

export function loadConfig(): Config {
  const configPath = join(process.cwd(), CONFIG_FILE);

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}\n` +
        `Please create a config.json file based on config.json.example`
    );
  }

  let rawConfig: unknown;
  try {
    const content = readFileSync(configPath, "utf-8");
    rawConfig = JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in config file: ${error.message}`);
    }
    throw error;
  }

  if (!validateConfig(rawConfig)) {
    throw new Error("Invalid config structure");
  }

  return rawConfig;
}
