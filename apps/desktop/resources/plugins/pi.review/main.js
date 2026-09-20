/**
 * Review — bundled first-party plugin (ADR local-002).
 *
 * The view is chrome only. Every host interaction goes through the reviewed
 * control-plane operations via `pi.desktop.invoke`, gated by the
 * `desktop.control` permission:
 *
 *   review/reviewTurns   read      turn-grouped change evidence for a session
 *   review/checkBatch    read      read-only rollback preflight
 *   review/rollbackBatch dangerous batch restore (turn | rewind), confirm:true
 *
 * The sandboxed view cannot reach `pi.*` itself; it calls
 * `window.pluginBridge.invoke("rv.*", payload)`, which the host forwards to
 * `onPanelInvoke` below.
 */

const COPY = {
  en: "Open the Review view from the work panel launcher.",
  zh: "请从工作面板的「新建」启动器打开「审阅」视图。",
};

/**
 * A plugin cannot dock its own work-panel view (the work-panel launcher owns
 * that surface), so the palette command points the user at the view instead.
 */
async function openCommand() {
  let locale = "en";
  try {
    locale = String(await pi.app.getLocale()).toLowerCase();
  } catch {
    /* fall back to English */
  }
  await pi.ui.showToast(locale.startsWith("zh") ? COPY.zh : COPY.en);
}

function requireSessionId(payload) {
  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId.trim() : "";
  if (!sessionId) throw new Error("sessionId required");
  return sessionId;
}

function requireSnapshotIds(payload) {
  if (!Array.isArray(payload?.snapshotIds) || payload.snapshotIds.length === 0) {
    throw new Error("snapshotIds required");
  }
  return payload.snapshotIds.map((id) => String(id));
}

const CHANNELS = {
  /** Sessions that can carry desktop review snapshots (native sessions cannot). */
  "rv.listSessions": async () => {
    const result = await pi.desktop.invoke({ operation: "session/list", args: [] });
    const sessions = (Array.isArray(result?.sessions) ? result.sessions : [])
      .filter((session) => {
        const id = String(session?.id ?? "");
        return id && !id.startsWith("native-pi:");
      })
      .map((session) => ({
        id: String(session.id),
        title: String(session.title ?? "") || String(session.id),
        updatedAt: String(session.updatedAt ?? ""),
      }));
    return { ok: true, sessions };
  },

  "rv.reviewTurns": async (payload) => {
    const sessionId = requireSessionId(payload);
    const input = { sessionId };
    if (Number.isInteger(payload?.messageLimit) && payload.messageLimit > 0) {
      input.messageLimit = payload.messageLimit;
    }
    const result = await pi.desktop.invoke({ operation: "review/reviewTurns", args: [input] });
    return { ok: true, ...result };
  },

  "rv.checkBatch": async (payload) => {
    const input = {
      sessionId: requireSessionId(payload),
      snapshotIds: requireSnapshotIds(payload),
    };
    const result = await pi.desktop.invoke({ operation: "review/checkBatch", args: [input] });
    return { ok: true, ...result };
  },

  "rv.rollbackBatch": async (payload) => {
    const mode = payload?.mode === "rewind" ? "rewind" : "turn";
    const input = {
      sessionId: requireSessionId(payload),
      snapshotIds: requireSnapshotIds(payload),
      mode,
    };
    // Dangerous operation: confirm:true makes the host show its native user
    // consent before the restore runs.
    const result = await pi.desktop.invoke({
      operation: "review/rollbackBatch",
      args: [input],
      confirm: true,
    });
    return { ok: true, mode, result };
  },
};

export async function onLoad() {
  await pi.commands.register({
    id: "review.open",
    title: "Review: Open",
    run: openCommand,
  });
}

export async function onUnload() {
  await pi.commands.unregister("review.open");
}

export async function onPanelInvoke(channel, payload) {
  const handler = CHANNELS[channel];
  if (!handler) {
    return { ok: false, code: "UNSUPPORTED", message: `unknown channel: ${channel}` };
  }
  try {
    return await handler(payload ?? {});
  } catch (error) {
    return {
      ok: false,
      code: error?.code || "UNKNOWN",
      message: error?.message ? String(error.message) : String(error),
    };
  }
}
