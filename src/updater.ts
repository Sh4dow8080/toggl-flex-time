import { VERSION } from "./version";
import { unlinkSync, renameSync, chmodSync } from "node:fs";
import { existsSync } from "node:fs";

const REPO = "Sh4dow8080/toggl-flex-time";
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

export interface UpdateInfo {
  version: string;
  downloadUrl: string;
}

/** Returns true if running as a compiled Bun binary (not via `bun run`). */
export function isCompiledBinary(): boolean {
  return !process.execPath.toLowerCase().includes("bun");
}

/** Simple semver compare: returns -1, 0, or 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

function getAssetName(): string {
  const platform = process.platform;
  if (platform === "win32") return "flex-windows-x64.exe";
  if (platform === "darwin") return "flex-darwin-x64";
  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Non-blocking check for a newer release. Returns update info if a newer
 * version is available, null otherwise. Silently swallows all errors.
 */
export async function checkForUpdate(): Promise<UpdateInfo | null> {
  if (!isCompiledBinary()) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(API_URL, {
      headers: { "User-Agent": "toggl-flex-time-updater" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = (await res.json()) as {
      tag_name: string;
      assets: { name: string; browser_download_url: string }[];
    };

    const latestVersion = data.tag_name.replace(/^v/, "");
    if (compareVersions(VERSION, latestVersion) >= 0) return null;

    const assetName = getAssetName();
    const asset = data.assets.find((a) => a.name === assetName);
    if (!asset) return null;

    return { version: latestVersion, downloadUrl: asset.browser_download_url };
  } catch {
    return null;
  }
}

/**
 * Downloads the latest binary and performs an atomic self-replace.
 * Called by `--update`.
 */
export async function performUpdate(): Promise<void> {
  if (!isCompiledBinary()) {
    console.log("Auto-update is only available in compiled binaries.");
    console.log("Run `bun run compile:mac` or `bun run compile:win` first.");
    return;
  }

  console.log(`Current version: ${VERSION}`);
  console.log("Checking for updates...");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  let data: { tag_name: string; assets: { name: string; browser_download_url: string }[] };
  try {
    const res = await fetch(API_URL, {
      headers: { "User-Agent": "toggl-flex-time-updater" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`GitHub API returned ${res.status}`);
    data = await res.json() as typeof data;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Failed to check for updates: ${err instanceof Error ? err.message : err}`);
  }

  const latestVersion = data.tag_name.replace(/^v/, "");
  if (compareVersions(VERSION, latestVersion) >= 0) {
    console.log(`Already up to date (v${VERSION}).`);
    return;
  }

  const assetName = getAssetName();
  const asset = data.assets.find((a) => a.name === assetName);
  if (!asset) {
    throw new Error(`No binary found for this platform (expected ${assetName})`);
  }

  console.log(`Downloading v${latestVersion}...`);
  const downloadRes = await fetch(asset.browser_download_url, {
    headers: { "User-Agent": "toggl-flex-time-updater" },
  });
  if (!downloadRes.ok) throw new Error(`Download failed: ${downloadRes.status}`);

  const binary = await downloadRes.arrayBuffer();
  const execPath = process.execPath;
  const newPath = execPath + ".new";
  const oldPath = execPath + ".old";

  // Write new binary
  try {
    await Bun.write(newPath, binary);
  } catch (err) {
    if (err instanceof Error && err.message.includes("EACCES")) {
      throw new Error(
        `Permission denied writing to ${newPath}\n` +
          `The binary is in a protected directory. Try: sudo ${execPath} --update`
      );
    }
    throw err;
  }

  // Make executable on macOS/Linux
  if (process.platform !== "win32") {
    chmodSync(newPath, 0o755);
  }

  // Atomic swap: current → .old, .new → current
  renameSync(execPath, oldPath);
  renameSync(newPath, execPath);

  // Try to clean up .old immediately (may fail on Windows)
  try {
    unlinkSync(oldPath);
  } catch {
    // Will be cleaned up on next run
  }

  console.log(`Updated to v${latestVersion}!`);
}

/** Deletes <execPath>.old if it exists (Windows cleanup from previous update). */
export function cleanupOldBinary(): void {
  if (!isCompiledBinary()) return;
  const oldPath = process.execPath + ".old";
  if (existsSync(oldPath)) {
    try {
      unlinkSync(oldPath);
    } catch {
      // Still locked, will try again next time
    }
  }
}
