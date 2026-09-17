import { existsSync } from "node:fs";
import { delimiter, join } from "node:path";
import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
// `electron` is imported lazily inside openPathInApp so this module stays
// loadable in plain-node tests (the npm "electron" package has no `shell`).
import { ErrorCodes, type OpenLocationApp, type OpenLocationAppKind } from "@pi-desktop/shared";

/**
 * "Open location" support for the conversation topbar: a static catalog of
 * editors, the platform file manager, and terminals that can open a session's
 * working directory. Detection is pure and injectable so tests never touch the
 * real filesystem or PATH; the process caches one detection result because
 * installed applications change out of band.
 */

export type { OpenLocationApp, OpenLocationAppKind };

type Platform = NodeJS.Platform;

type CatalogEntry = OpenLocationApp & {
  /** Platforms on which this entry can appear at all. */
  platforms: Platform[];
  /** macOS bundle name checked under /Applications and ~/Applications. */
  macApp?: string;
  /** CLI probed on PATH (macOS fallback, Windows/Linux primary probe). */
  cli?: string;
};

const EDITORS: CatalogEntry[] = [
  {
    id: "vscode",
    name: "Visual Studio Code",
    kind: "editor",
    platforms: ["darwin", "win32", "linux"],
    macApp: "Visual Studio Code",
    cli: "code",
  },
  {
    id: "cursor",
    name: "Cursor",
    kind: "editor",
    platforms: ["darwin", "win32", "linux"],
    macApp: "Cursor",
    cli: "cursor",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    kind: "editor",
    platforms: ["darwin", "win32", "linux"],
    macApp: "Windsurf",
    cli: "windsurf",
  },
  {
    id: "antigravity",
    name: "Antigravity",
    kind: "editor",
    platforms: ["darwin"],
    macApp: "Antigravity",
  },
  {
    id: "zed",
    name: "Zed",
    kind: "editor",
    platforms: ["darwin", "linux"],
    macApp: "Zed",
    cli: "zed",
  },
  {
    id: "xcode",
    name: "Xcode",
    kind: "editor",
    platforms: ["darwin"],
    macApp: "Xcode",
  },
  {
    id: "android-studio",
    name: "Android Studio",
    kind: "editor",
    platforms: ["darwin"],
    macApp: "Android Studio",
  },
];

const FILE_MANAGERS: CatalogEntry[] = [
  { id: "finder", name: "Finder", kind: "fileManager", platforms: ["darwin"] },
  { id: "explorer", name: "File Explorer", kind: "fileManager", platforms: ["win32"] },
  { id: "xdg-open", name: "Files", kind: "fileManager", platforms: ["linux"] },
];

const MAC_TERMINALS: CatalogEntry[] = [
  { id: "terminal", name: "Terminal", kind: "terminal", platforms: ["darwin"], macApp: "Terminal" },
  { id: "iterm2", name: "iTerm2", kind: "terminal", platforms: ["darwin"], macApp: "iTerm" },
  { id: "ghostty", name: "Ghostty", kind: "terminal", platforms: ["darwin"], macApp: "Ghostty" },
  { id: "warp", name: "Warp", kind: "terminal", platforms: ["darwin"], macApp: "Warp" },
];

/** Every application "open location" may ever launch. Order = menu order. */
export const OPEN_LOCATION_CATALOG: readonly CatalogEntry[] = [
  ...EDITORS,
  ...FILE_MANAGERS,
  ...MAC_TERMINALS,
];

export type DetectionEnvironment = {
  platform: Platform;
  existsSync: (path: string) => boolean;
  /** True when the CLI name resolves on PATH. */
  which: (command: string) => boolean;
  homeDir: string;
};

function macAppInstalled(entry: CatalogEntry, env: DetectionEnvironment): boolean {
  if (!entry.macApp) return false;
  return (
    env.existsSync(`/Applications/${entry.macApp}.app`) ||
    env.existsSync(join(env.homeDir, "Applications", `${entry.macApp}.app`))
  );
}

function isDetected(entry: CatalogEntry, env: DetectionEnvironment): boolean {
  // The platform file manager is part of the OS; it is always listed.
  if (entry.kind === "fileManager") return true;
  if (env.platform === "darwin" && macAppInstalled(entry, env)) return true;
  // CLI probes catch non-standard installs (Homebrew, custom prefixes).
  return entry.cli ? env.which(entry.cli) : false;
}

/** Filter the catalog to entries present on this machine, in catalog order. */
export function detectOpenLocationApps(env: DetectionEnvironment): OpenLocationApp[] {
  return OPEN_LOCATION_CATALOG.filter(
    (entry) => entry.platforms.includes(env.platform) && isDetected(entry, env),
  ).map(({ id, name, kind }) => ({ id, name, kind }));
}

/** Resolve a CLI name against PATH without invoking a shell. */
export function commandOnPath(
  command: string,
  pathEnv: string | undefined,
  platform: Platform,
  exists: (path: string) => boolean = existsSync,
): boolean {
  if (!pathEnv) return false;
  const extensions = platform === "win32" ? [".exe", ".cmd", ".bat", ""] : [""];
  for (const dir of pathEnv.split(delimiter)) {
    if (!dir) continue;
    for (const ext of extensions) {
      if (exists(join(dir, command + ext))) return true;
    }
  }
  return false;
}

let cachedApps: OpenLocationApp[] | null = null;

/** Detect once per process; installed applications change out of band. */
export function listOpenLocationApps(): OpenLocationApp[] {
  if (cachedApps) return cachedApps;
  const platform = process.platform;
  cachedApps = detectOpenLocationApps({
    platform,
    existsSync,
    which: (command) => commandOnPath(command, process.env.PATH, platform),
    homeDir: homedir(),
  });
  return cachedApps;
}

/**
 * The command an open request resolves to. Kept pure so tests never spawn.
 * Every variant carries an argument list, never a concatenated shell string.
 */
export type OpenLocationCommand =
  | { type: "macOpen"; appName: string; path: string }
  | { type: "shellOpenPath"; path: string }
  | { type: "spawn"; command: string; args: string[] };

export function buildOpenLocationCommand(
  appId: string,
  targetPath: string,
  platform: Platform,
): OpenLocationCommand {
  const entry = OPEN_LOCATION_CATALOG.find(
    (candidate) => candidate.id === appId && candidate.platforms.includes(platform),
  );
  if (!entry) {
    throw Object.assign(new Error(`unknown open-location app: ${appId}`), {
      errorCode: ErrorCodes.INVALID_ARGUMENT,
    });
  }
  if (entry.kind === "fileManager") return { type: "shellOpenPath", path: targetPath };
  if (platform === "darwin" && entry.macApp) {
    return { type: "macOpen", appName: entry.macApp, path: targetPath };
  }
  if (entry.cli) {
    // Windows CLI shims are .cmd batch files; cmd.exe resolves them without
    // us concatenating a shell string.
    return platform === "win32"
      ? { type: "spawn", command: "cmd.exe", args: ["/d", "/s", "/c", entry.cli, targetPath] }
      : { type: "spawn", command: entry.cli, args: [targetPath] };
  }
  throw Object.assign(new Error(`application is not installed: ${appId}`), {
    errorCode: ErrorCodes.NOT_FOUND,
  });
}

function execFileAsync(command: string, args: string[]): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    execFile(command, args, (error) => (error ? rejectPromise(error) : resolvePromise()));
  });
}

/** Open `targetPath` in a whitelisted, detected catalog application. */
export async function openPathInApp(appId: string, targetPath: string): Promise<void> {
  const detected = listOpenLocationApps().some((candidate) => candidate.id === appId);
  if (!detected) {
    // An id outside the catalog is INVALID_ARGUMENT; a catalog id that was not
    // detected on this machine is NOT_FOUND.
    const known = OPEN_LOCATION_CATALOG.some((candidate) => candidate.id === appId);
    throw Object.assign(
      new Error(
        known
          ? `application is not installed: ${appId}`
          : `unknown open-location app: ${appId}`,
      ),
      { errorCode: known ? ErrorCodes.NOT_FOUND : ErrorCodes.INVALID_ARGUMENT },
    );
  }
  const command = buildOpenLocationCommand(appId, targetPath, process.platform);
  if (command.type === "shellOpenPath") {
    const { shell } = await import("electron");
    const openError = await shell.openPath(command.path);
    if (openError) throw new Error(openError);
    return;
  }
  if (command.type === "macOpen") {
    await execFileAsync("open", ["-a", command.appName, command.path]);
    return;
  }
  const child = spawn(command.command, command.args, { detached: true, stdio: "ignore" });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("spawn", () => resolvePromise());
  });
  child.unref();
}
