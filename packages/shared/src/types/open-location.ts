/**
 * "Open location" contract for the conversation topbar: the catalog of
 * whitelisted local applications that can open a session's working directory.
 * The renderer only ever sees detection results and sends back a catalog `id`;
 * paths and launch commands stay in the main process.
 */
export type OpenLocationAppKind = "editor" | "fileManager" | "terminal";

export type OpenLocationApp = {
  /** Stable catalog identifier, e.g. "vscode". Whitelisted main-side. */
  id: string;
  /** Display name, e.g. "Visual Studio Code". */
  name: string;
  kind: OpenLocationAppKind;
};
