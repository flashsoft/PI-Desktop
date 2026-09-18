import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OpenLocationApp } from "@pi-desktop/shared";
import { api } from "../lib/api";
import {
  effectiveSessionBranch,
  effectiveSessionPath,
} from "../lib/session-context";
import { useAppStore } from "../stores/app-store";
import {
  IconBranch,
  IconCheck,
  IconChevronDown,
  IconFolder,
  IconTerminal,
  IconVSCode,
} from "./icons";
import { TooltipButton } from "./ui";

const PREFERRED_APP_KEY = "pi-desktop.topbar.openLocationApp";
const COPY_FEEDBACK_MS = 1200;

async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Clipboard can reject when the window is unfocused; the badge simply
    // skips the check feedback instead of surfacing an error toast.
  }
}

/** Briefly swap the badge glyph to a check after a successful copy. */
function useCopyFeedback(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return [
    copied,
    () => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
    },
  ];
}

function preferredAppId(): string | null {
  try {
    return localStorage.getItem(PREFERRED_APP_KEY);
  } catch {
    return null;
  }
}

function rememberAppId(id: string): void {
  try {
    localStorage.setItem(PREFERRED_APP_KEY, id);
  } catch {
    /* private mode: preference simply does not persist */
  }
}

function appIcon(app: OpenLocationApp | undefined, size = 13) {
  if (!app) return <IconVSCode size={size} />;
  if (app.id === "vscode") return <IconVSCode size={size} />;
  if (app.kind === "terminal") return <IconTerminal size={size} />;
  if (app.kind === "fileManager") return <IconFolder size={size} />;
  return <IconVSCode size={size} />;
}

/**
 * The conversation topbar's session-context cluster: a branch badge (click to
 * copy the branch name) and a split "open location" button whose caret lists
 * the editors, file manager, and terminals detected on this machine. The main
 * half opens the directory directly with the persisted preferred app.
 */
export function SessionContextBadges() {
  const { t } = useTranslation();
  const activeSessionId = useAppStore((s) => s.activeSessionId);
  const sessions = useAppStore((s) => s.sessions);
  const workspace = useAppStore((s) => s.workspace);

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const path = effectiveSessionPath(activeSession, workspace);
  const branch = effectiveSessionBranch(activeSession, workspace);

  const [apps, setApps] = useState<OpenLocationApp[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [branchCopied, markBranchCopied] = useCopyFeedback();
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Prefetch the detected catalog on mount so a direct click never waits for
  // the menu round-trip.
  useEffect(() => {
    let cancelled = false;
    api
      .listOpenLocationApps()
      .then((result) => {
        if (!cancelled) setApps(result.apps);
      })
      .catch(() => {
        /* host not ready yet; the split button stays on its fallback icon */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Close the app menu on outside pointer down / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  if (!path) return null;

  const preferred =
    apps.find((app) => app.id === preferredAppId()) ??
    apps.find((app) => app.kind === "editor") ??
    apps[0];

  const openWith = (appId: string) => {
    if (!activeSessionId) return;
    void api.openLocation(activeSessionId, appId).catch(() => {
      /* launch failures surface in the log; the topbar stays quiet */
    });
  };

  return (
    <div className="sc-badges">
      {branch ? (
        <TooltipButton
          type="button"
          className="sc-badge sc-badge-branch"
          tooltip={branchCopied ? t("topbar.copied") : t("topbar.copyBranch", { branch })}
          ariaLabel={t("topbar.copyBranch", { branch })}
          onClick={() => {
            void copyText(branch).then(markBranchCopied);
          }}
        >
          {branchCopied ? <IconCheck size={12} /> : <IconBranch size={12} />}
          <span className="sc-badge-label">{branch}</span>
        </TooltipButton>
      ) : null}


      <div className="sc-split" ref={menuRef}>
        <TooltipButton
          type="button"
          className="sc-split-main"
          tooltip={
            preferred
              ? t("topbar.openWith", { name: preferred.name })
              : t("topbar.openLocation")
          }
          ariaLabel={t("topbar.openLocation")}
          onClick={() => {
            if (preferred) openWith(preferred.id);
          }}
        >
          {appIcon(preferred)}
          <span className="sc-split-label">{t("topbar.openLocation")}</span>
        </TooltipButton>
        <TooltipButton
          type="button"
          className="sc-split-caret"
          tooltip={t("topbar.openLocation")}
          ariaLabel={t("topbar.openLocation")}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <IconChevronDown size={12} />
        </TooltipButton>
        {menuOpen ? (
          <div className="sc-menu" role="menu">
            {apps.length === 0 ? (
              <div className="sc-menu-empty">{t("topbar.noOpenLocationApps")}</div>
            ) : (
              apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  role="menuitem"
                  className="sc-menu-item"
                  onClick={() => {
                    rememberAppId(app.id);
                    setMenuOpen(false);
                    openWith(app.id);
                  }}
                >
                  {appIcon(app)}
                  <span>{app.name}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
