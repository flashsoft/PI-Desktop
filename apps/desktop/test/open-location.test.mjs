import assert from "node:assert/strict";
import { delimiter, join } from "node:path";
import test from "node:test";
import {
  OPEN_LOCATION_CATALOG,
  buildOpenLocationCommand,
  commandOnPath,
  detectOpenLocationApps,
} from "../electron/main/open-location.ts";

const noApps = () => false;
const noCli = () => false;

function macEnv(overrides = {}) {
  return {
    platform: "darwin",
    existsSync: noApps,
    which: noCli,
    homeDir: "/home/tester",
    ...overrides,
  };
}

test("catalog carries the documented ids and kinds", () => {
  const byId = new Map(OPEN_LOCATION_CATALOG.map((entry) => [entry.id, entry]));
  for (const id of [
    "vscode",
    "cursor",
    "windsurf",
    "antigravity",
    "zed",
    "xcode",
    "android-studio",
    "finder",
    "iterm2",
    "ghostty",
    "warp",
  ]) {
    assert.ok(byId.has(id), `missing catalog id: ${id}`);
  }
  assert.equal(byId.get("vscode").kind, "editor");
  assert.equal(byId.get("finder").kind, "fileManager");
  assert.equal(byId.get("iterm2").kind, "terminal");
});

test("catalog ids are unique", () => {
  const ids = OPEN_LOCATION_CATALOG.map((entry) => entry.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("detection lists the platform file manager without any probe", () => {
  const apps = detectOpenLocationApps(macEnv());
  assert.deepEqual(apps, [{ id: "finder", name: "Finder", kind: "fileManager" }]);
});

test("detection finds macOS bundles in /Applications and ~/Applications", () => {
  const apps = detectOpenLocationApps(
    macEnv({
      existsSync: (path) =>
        path === "/Applications/Visual Studio Code.app" ||
        path === "/home/tester/Applications/Ghostty.app",
    }),
  );
  assert.deepEqual(
    apps.map((app) => app.id),
    ["vscode", "finder", "ghostty"],
  );
});

test("detection falls back to CLI probes for non-standard installs", () => {
  const apps = detectOpenLocationApps(
    macEnv({ which: (command) => command === "code" || command === "zed" }),
  );
  assert.deepEqual(
    apps.map((app) => app.id),
    ["vscode", "zed", "finder"],
  );
});

test("linux detection relies on CLI probes and the OS file manager", () => {
  const apps = detectOpenLocationApps({
    platform: "linux",
    existsSync: noApps,
    which: (command) => command === "code",
    homeDir: "/home/tester",
  });
  assert.deepEqual(
    apps.map((app) => app.id),
    ["vscode", "xdg-open"],
  );
});

test("commandOnPath respects PATHEXT-style shims on Windows", () => {
  // The extension matrix is platform-driven while the delimiter and join()
  // separator follow the host, so simulate with host-style directories: the
  // assertion targets the .exe/.cmd/.bat probing, not drive-letter parsing.
  const pathEnv = ["/tools", "/bin"].join(delimiter);
  assert.equal(
    commandOnPath("code", pathEnv, "win32", (p) => p === join("/bin", "code.cmd")),
    true,
  );
  assert.equal(commandOnPath("code", pathEnv, "win32", () => false), false);
  assert.equal(commandOnPath("code", undefined, "win32"), false);
});

test("buildOpenLocationCommand prefers open -a for macOS bundles", () => {
  assert.deepEqual(buildOpenLocationCommand("vscode", "/repo", "darwin"), {
    type: "macOpen",
    appName: "Visual Studio Code",
    path: "/repo",
  });
  assert.deepEqual(buildOpenLocationCommand("iterm2", "/repo", "darwin"), {
    type: "macOpen",
    appName: "iTerm",
    path: "/repo",
  });
});

test("buildOpenLocationCommand uses the OS opener for file managers", () => {
  assert.deepEqual(buildOpenLocationCommand("finder", "/repo", "darwin"), {
    type: "shellOpenPath",
    path: "/repo",
  });
  assert.deepEqual(buildOpenLocationCommand("xdg-open", "/repo", "linux"), {
    type: "shellOpenPath",
    path: "/repo",
  });
});

test("buildOpenLocationCommand spawns CLIs with argument arrays", () => {
  assert.deepEqual(buildOpenLocationCommand("vscode", "/repo", "linux"), {
    type: "spawn",
    command: "code",
    args: ["/repo"],
  });
  assert.deepEqual(buildOpenLocationCommand("vscode", "C:\\repo", "win32"), {
    type: "spawn",
    command: "cmd.exe",
    args: ["/d", "/s", "/c", "code", "C:\\repo"],
  });
});

test("buildOpenLocationCommand rejects ids outside the catalog", () => {
  assert.throws(
    () => buildOpenLocationCommand("rm", "/repo", "darwin"),
    /unknown open-location app/,
  );
  // Platform-gated entries are unknown on other platforms.
  assert.throws(
    () => buildOpenLocationCommand("iterm2", "/repo", "linux"),
    /unknown open-location app/,
  );
});
