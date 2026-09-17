import { ErrorCodes, IPC } from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import { listOpenLocationApps, openPathInApp } from "../open-location";
import type { IpcRegistrar } from "./types";

export type OpenLocationIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
};

/**
 * "Open location" channels for the conversation topbar. The renderer names a
 * session and a catalog app id only; the target directory is always resolved
 * here from the host's own records, so a renderer-supplied path can never
 * steer `open`/`spawn` to an arbitrary location.
 */
export function registerOpenLocationIpc({
  registrar,
  getHost,
}: OpenLocationIpcDependencies): void {
  registrar.handle(IPC.invoke.openLocationApps, async () => ({
    apps: listOpenLocationApps(),
  }));

  registrar.handle(
    IPC.invoke.openLocation,
    async (input: { sessionId?: unknown; appId?: unknown }) => {
      const sessionId = String(input?.sessionId ?? "").trim();
      const appId = String(input?.appId ?? "").trim();
      if (!sessionId || !appId) {
        throw Object.assign(new Error("sessionId and appId are required"), {
          errorCode: ErrorCodes.INVALID_ARGUMENT,
        });
      }
      const host = getHost();
      if (!host) {
        throw Object.assign(new Error("host unavailable"), {
          errorCode: ErrorCodes.HOST_UNAVAILABLE,
        });
      }
      const result = await host.call<{
        session?: { projectPath?: unknown } | null;
      }>("session.get", { id: sessionId, messageLimit: 1 });
      const projectPath =
        typeof result?.session?.projectPath === "string"
          ? result.session.projectPath.trim()
          : "";
      let target = projectPath;
      if (!target) {
        // Projectless sessions fall back to the current workspace root.
        const workspace = await host.call<{ workspace?: { path?: unknown } | null }>(
          "workspace.get",
        );
        target =
          typeof workspace?.workspace?.path === "string"
            ? workspace.workspace.path.trim()
            : "";
      }
      if (!target) {
        throw Object.assign(new Error("session has no working directory"), {
          errorCode: ErrorCodes.NOT_FOUND,
        });
      }
      await openPathInApp(appId, target);
      return { ok: true };
    },
  );
}
