/**
 * Interactive setup wizard for creating config.json.
 * Guides users through Toggl API token, workspace selection, and hours configuration.
 */

import { password, input, confirm, select } from "@inquirer/prompts";
import { ExitPromptError } from "@inquirer/core";
import { existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { getDataDir } from "./paths";
import { CONFIG_FILE } from "./config";
import { createAuthHeader, TOGGL_API_BASE } from "./toggl";

// ANSI color codes
const c = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

interface TogglUser {
  fullname: string;
  email: string;
}

interface TogglWorkspace {
  id: number;
  name: string;
}

async function validateToken(apiToken: string): Promise<TogglUser | null> {
  try {
    const res = await fetch(`${TOGGL_API_BASE}/me`, {
      headers: { Authorization: createAuthHeader(apiToken) },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as TogglUser;
    return data;
  } catch {
    return null;
  }
}

async function fetchWorkspaces(apiToken: string): Promise<TogglWorkspace[]> {
  const res = await fetch(`${TOGGL_API_BASE}/workspaces`, {
    headers: { Authorization: createAuthHeader(apiToken) },
  });
  if (!res.ok) throw new Error(`Failed to fetch workspaces: ${res.status}`);
  return (await res.json()) as TogglWorkspace[];
}

export function parseHoursInput(input: string, defaultValue: number, max: number = 24): number | null {
  if (input.trim() === "") return defaultValue;
  const num = Number(input);
  if (isNaN(num) || num <= 0 || num > max) return null;
  return num;
}

export function parseCustomHolidays(input: string): string[] | null {
  if (input.trim() === "") return [];
  const dateRegex = /^(\d{4}|\*)-\d{2}-\d{2}$/;
  const dates = input
    .split(",")
    .map((d) => d.trim())
    .filter((d) => d !== "");
  for (const date of dates) {
    if (!dateRegex.test(date)) return null;
  }
  return dates;
}

export function maskToken(token: string): string {
  if (token.length <= 4) return "*".repeat(token.length);
  return token.slice(0, 4) + "*".repeat(token.length - 4);
}

export async function runSetup(): Promise<void> {
  try {
    console.log(`\n${c.bold}${c.cyan}Toggl Flex Time Setup${c.reset}\n`);
    console.log("This wizard will create your configuration file.\n");

    // Check for existing config
    const configDir = getDataDir();
    const configPath = join(configDir, CONFIG_FILE);

    if (existsSync(configPath)) {
      console.log(
        `${c.yellow}A config file already exists at: ${configPath}${c.reset}`,
      );
      const overwrite = await confirm({ message: "Overwrite existing config?", default: false });
      if (!overwrite) {
        console.log(`\n${c.dim}Setup cancelled.${c.reset}`);
        return;
      }
      console.log("");
    }

    // Step 1: Toggl API token
    console.log(`${c.bold}Step 1: Toggl API Token${c.reset}`);
    console.log(
      `${c.dim}Find your token at: https://track.toggl.com/profile (scroll to API Token)${c.reset}\n`,
    );

    let apiToken = "";
    let user: TogglUser | null = null;

    while (!user) {
      apiToken = await password({ message: "API token", mask: "*" });

      if (!apiToken) {
        console.log(`${c.red}Token cannot be empty.${c.reset}\n`);
        continue;
      }

      process.stdout.write(`${c.dim}Validating token...${c.reset}`);
      try {
        user = await validateToken(apiToken);
      } catch {
        process.stdout.write("\r" + " ".repeat(30) + "\r");
        console.log(
          `${c.red}Network error. Please check your connection and try again.${c.reset}\n`,
        );
        continue;
      }

      process.stdout.write("\r" + " ".repeat(30) + "\r");

      if (!user) {
        console.log(
          `${c.red}Invalid token. Please check and try again.${c.reset}\n`,
        );
      }
    }

    console.log(
      `${c.green}Authenticated as ${user.fullname} (${user.email})${c.reset}\n`,
    );

    // Step 2: Workspace selection
    console.log(`${c.bold}Step 2: Workspace${c.reset}\n`);

    let workspaces: TogglWorkspace[];
    try {
      workspaces = await fetchWorkspaces(apiToken);
    } catch (err) {
      console.log(
        `${c.red}Failed to fetch workspaces: ${err instanceof Error ? err.message : err}${c.reset}`,
      );
      return;
    }

    if (workspaces.length === 0) {
      console.log(
        `${c.red}No workspaces found. Please create one at toggl.com first.${c.reset}`,
      );
      return;
    }

    let selectedWorkspace: TogglWorkspace;

    if (workspaces.length === 1) {
      selectedWorkspace = workspaces[0]!;
      console.log(
        `Using workspace: ${c.green}${selectedWorkspace.name}${c.reset} (only one available)\n`,
      );
    } else {
      const workspaceId = await select({
        message: "Select workspace",
        choices: workspaces.map((ws) => ({
          name: ws.name,
          value: ws.id,
        })),
      });
      selectedWorkspace = workspaces.find((ws) => ws.id === workspaceId)!;
      console.log(`\nSelected: ${c.green}${selectedWorkspace.name}${c.reset}\n`);
    }

    // Step 3: Hours configuration
    console.log(`${c.bold}Step 3: Working Hours${c.reset}\n`);

    const hoursPerDayStr = await input({
      message: "Hours per day",
      default: "7",
      validate: (value) => {
        const result = parseHoursInput(value, 7);
        return result !== null || "Please enter a number between 1 and 24.";
      },
    });
    const hoursPerDay = parseHoursInput(hoursPerDayStr, 7)!;

    const defaultWeek = String(hoursPerDay * 5);
    const hoursPerWeekStr = await input({
      message: "Hours per week",
      default: defaultWeek,
      validate: (value) => {
        const result = parseHoursInput(value, hoursPerDay * 5, 168);
        return result !== null || "Please enter a valid positive number.";
      },
    });
    const hoursPerWeek = parseHoursInput(hoursPerWeekStr, hoursPerDay * 5, 168)!;

    console.log("");

    // Step 4: Custom holidays
    console.log(`${c.bold}Step 4: Custom Holidays${c.reset}`);
    console.log(
      `${c.dim}Danish public holidays are included automatically.${c.reset}`,
    );
    console.log(
      `${c.dim}Add company-specific days off. Use YYYY-MM-DD for one-off or *-MM-DD for recurring.${c.reset}`,
    );
    console.log(
      `${c.dim}Example: 2025-12-24 or *-12-24 (every year)${c.reset}\n`,
    );

    const dateRegex = /^(\d{4}|\*)-\d{2}-\d{2}$/;
    const customHolidays: string[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const listHint = customHolidays.length > 0
        ? `${c.dim}  Added: ${customHolidays.join(", ")}${c.reset}\n`
        : "";
      if (listHint) process.stdout.write(listHint);

      const date = await input({
        message: customHolidays.length === 0
          ? "Add a holiday (or press Enter to skip)"
          : "Add another holiday (or press Enter to finish)",
        default: "",
        validate: (value) => {
          if (value.trim() === "") return true;
          return dateRegex.test(value.trim()) || "Invalid format. Use YYYY-MM-DD or *-MM-DD.";
        },
      });

      if (date.trim() === "") break;
      customHolidays.push(date.trim());
    }

    console.log("");

    // Summary
    console.log(`${c.bold}Configuration Summary${c.reset}`);
    console.log(`${c.dim}${"─".repeat(40)}${c.reset}`);
    console.log(`  API token:        ${maskToken(apiToken)}`);
    console.log(
      `  Workspace:        ${selectedWorkspace.name} (ID: ${selectedWorkspace.id})`,
    );
    console.log(`  Hours/day:        ${hoursPerDay}`);
    console.log(`  Hours/week:       ${hoursPerWeek}`);
    console.log(
      `  Custom holidays:  ${customHolidays.length > 0 ? customHolidays.join(", ") : "(none)"}`,
    );
    console.log(`${c.dim}${"─".repeat(40)}${c.reset}`);
    console.log(`  Config path:      ${configPath}`);
    console.log("");

    const shouldSave = await confirm({ message: "Save this configuration?", default: true });
    if (!shouldSave) {
      console.log(`\n${c.dim}Setup cancelled.${c.reset}`);
      return;
    }

    // Write config
    const config = {
      togglApiToken: apiToken,
      workspaceId: selectedWorkspace.id,
      hoursPerDay,
      hoursPerWeek,
      customHolidays,
    };

    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

    console.log(`\n${c.green}Configuration saved to ${configPath}${c.reset}`);
    console.log(
      `${c.dim}Run 'flex' to see your flex time.${c.reset}\n`,
    );
  } catch (error) {
    if (error instanceof ExitPromptError) {
      console.log(`\n${c.dim}Setup cancelled.${c.reset}`);
      return;
    }
    throw error;
  }
}
