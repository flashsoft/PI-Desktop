import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  ReviewCheckTurnResult,
  ReviewRollbackTurnMode,
} from "@pi-desktop/shared";
import {
  groupReviewChangesByTurn,
  reviewChangesFromMessages,
  summarizeReviewChanges,
  type ReviewTurnGroup,
} from "../../lib/workspace-review";
import { useAppStore } from "../../stores/app-store";
import { IconChevronRight, IconDiff, IconUndo2 } from "../icons";
import { ReviewChangeCard } from "../ReviewChangeCard";
import { Button, cx, portalOverlay } from "../ui";
import { WorkTabEmpty } from "./WorkTabEmpty";

function uniquePaths(group: ReviewTurnGroup): number {
  return new Set(group.entries.map((entry) => entry.change.path)).size;
}

/** Consequence scope of a rewind: this turn plus every later turn. */
function rewindGroups(
  groups: ReviewTurnGroup[],
  group: ReviewTurnGroup,
): ReviewTurnGroup[] {
  // Only turns that still have active changes take part in a rewind; a fully
  // rolled-back turn contributes neither snapshot ids nor consequence counts.
  return groups.filter(
    (candidate) => candidate.turnIndex >= group.turnIndex && candidate.activeCount > 0,
  );
}

function rewindScope(
  groups: ReviewTurnGroup[],
  group: ReviewTurnGroup,
): { turns: number; files: number } {
  const affected = rewindGroups(groups, group);
  return {
    turns: affected.length,
    files: new Set(
      affected.flatMap((candidate) =>
        candidate.entries.map((entry) => entry.change.path),
      ),
    ).size,
  };
}

function RewindConfirmDialog({
  groups,
  group,
  check,
  busy,
  onCancel,
  onConfirm,
}: {
  groups: ReviewTurnGroup[];
  group: ReviewTurnGroup;
  /** Preflight over the full rewind snapshot set; null while still loading. */
  check: ReviewCheckTurnResult | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  const scope = rewindScope(groups, group);
  const hasUnavailable = check?.files.some((file) => !file.reversible) ?? false;
  const hasBlockedBy = check?.files.some((file) => file.blockedBy) ?? false;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel]);

  return portalOverlay(
    <div
      className="overlay review-rewind-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="dialog review-rewind-dialog"
        role="dialog"
        aria-modal
        aria-labelledby="review-rewind-title"
      >
        <h3 id="review-rewind-title" className="review-rewind-title">
          {t("panel.review.rollbackTurnConfirmTitle")}
        </h3>
        <p className="review-rewind-body">
          {t("panel.review.rollbackTurnConfirmBody", {
            turns: scope.turns,
            files: scope.files,
          })}
        </p>
        {hasUnavailable && (
          <p className="review-rewind-hint">
            {t("panel.review.rollbackTurnUnavailable")}
          </p>
        )}
        {hasBlockedBy && (
          <p className="review-rewind-hint">
            {t("panel.review.rollbackTurnBlockedBy")}
          </p>
        )}
        <div className="review-rewind-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy
              ? t("panel.review.rollingBack")
              : t("panel.review.rollbackTurnConfirmAction")}
          </Button>
        </div>
      </div>
    </div>,
  );
}

function ReviewTurnGroupView({
  groups,
  group,
  defaultOpen,
  running,
  refreshToken,
}: {
  groups: ReviewTurnGroup[];
  group: ReviewTurnGroup;
  defaultOpen: boolean;
  running: boolean;
  refreshToken: string;
}) {
  const { t } = useTranslation();
  const checkWorkspaceTurn = useAppStore((state) => state.checkWorkspaceTurn);
  const rollbackWorkspaceTurn = useAppStore((state) => state.rollbackWorkspaceTurn);
  const [open, setOpen] = useState(defaultOpen);
  const [check, setCheck] = useState<ReviewCheckTurnResult | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmCheck, setConfirmCheck] = useState<ReviewCheckTurnResult | null>(null);
  const [rollingBack, setRollingBack] = useState<ReviewRollbackTurnMode | null>(null);

  // A rewind reverts this turn AND every later turn (D-turn-review): the host
  // only receives what the caller passes, so later turns' snapshot ids must
  // be included, in chronological order, or their files stay behind.
  const rewindSnapshotIds = () =>
    rewindGroups(groups, group).flatMap((candidate) => candidate.snapshotIds);

  const snapshotKey = group.snapshotIds.join(",");
  useEffect(() => {
    let alive = true;
    setCheck(null);
    void checkWorkspaceTurn({ snapshotIds: group.snapshotIds }).then((result) => {
      if (alive) setCheck(result);
    });
    return () => {
      alive = false;
    };
    // refreshToken re-runs the preflight after a rollback changed review state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkWorkspaceTurn, snapshotKey, refreshToken]);

  const runRollback = async (mode: ReviewRollbackTurnMode) => {
    if (rollingBack || running) return;
    setRollingBack(mode);
    try {
      const snapshotIds =
        mode === "rewind" ? rewindSnapshotIds() : group.snapshotIds;
      await rollbackWorkspaceTurn({ snapshotIds, mode });
    } finally {
      setRollingBack(null);
      setConfirming(false);
    }
  };

  // The confirmation preflights the whole rewind set so its hints (unusable
  // snapshots, cross-session attribution) cover later turns too; this also
  // retries a preflight whose earlier group-level attempt failed.
  const openConfirm = () => {
    setConfirming(true);
    setConfirmCheck(null);
    void checkWorkspaceTurn({ snapshotIds: rewindSnapshotIds() }).then(
      setConfirmCheck,
    );
  };

  const allRolledBack = group.activeCount === 0;
  const surgicalReady = check?.clean === true;

  return (
    <section className="review-turn-group">
      <div className="review-turn-header-row">
        <button
          type="button"
          className="review-turn-header"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <IconChevronRight
            size={13}
            className={cx("review-turn-chevron", open && "is-open")}
          />
          <span className="review-turn-title">
            {group.anchorId
              ? t("panel.review.turnLabel", { index: group.turnIndex })
              : t("panel.review.changes", { count: group.entries.length })}
          </span>
          {group.label && <span className="review-turn-label">{group.label}</span>}
          <span className="review-turn-meta">
            <span className="review-turn-files">
              {t("panel.review.filesChanged", { count: uniquePaths(group) })}
            </span>
            <span className="review-toolbar-counts diff-counts">
              <span className="diff-count-add">+{group.additions}</span>
              <span className="diff-count-del">−{group.deletions}</span>
            </span>
            {allRolledBack && (
              <span className="review-turn-state">{t("panel.review.rolledBack")}</span>
            )}
          </span>
        </button>
        {!allRolledBack && (
          <span className="review-turn-actions">
            {surgicalReady ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={running || rollingBack !== null}
                title={running ? t("panel.review.rollbackTurnBusy") : undefined}
                onClick={() => void runRollback("turn")}
              >
                <IconUndo2 size={13} />
                {rollingBack === "turn"
                  ? t("panel.review.rollingBack")
                  : t("panel.review.rollbackTurn")}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={running || rollingBack !== null}
                title={running ? t("panel.review.rollbackTurnBusy") : undefined}
                onClick={openConfirm}
              >
                <IconUndo2 size={13} />
                {rollingBack === "rewind"
                  ? t("panel.review.rollingBack")
                  : t("panel.review.rollbackToBeforeTurn")}
              </Button>
            )}
          </span>
        )}
      </div>
      {open && (
        <div className="review-turn-body">
          {group.entries.map((entry) => (
            <ReviewChangeCard
              key={entry.change.snapshotId}
              message={entry.message}
              compact
            />
          ))}
        </div>
      )}
      {confirming && (
        <RewindConfirmDialog
          groups={groups}
          group={group}
          check={confirmCheck}
          busy={rollingBack !== null}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void runRollback("rewind")}
        />
      )}
    </section>
  );
}

export function ReviewTab() {
  const { t } = useTranslation();
  const messages = useAppStore((state) => state.messages);
  const running = useAppStore((state) => state.isRunning);
  const entries = useMemo(() => reviewChangesFromMessages(messages), [messages]);
  const summary = useMemo(() => summarizeReviewChanges(entries), [entries]);
  const groups = useMemo(
    () => groupReviewChangesByTurn(messages, entries),
    [messages, entries],
  );
  // Any review-state flip (a rollback landing) re-runs every group's preflight.
  const refreshToken = useMemo(
    () =>
      entries
        .map((entry) => `${entry.change.snapshotId}:${entry.change.state}`)
        .join("|"),
    [entries],
  );

  if (entries.length === 0) {
    return (
      <WorkTabEmpty
        icon={IconDiff}
        title={t("panel.review.noChanges")}
      />
    );
  }

  return (
    <div className="review-tab">
      <div className="review-toolbar">
        <span className="review-summary">
          {t("panel.review.changes", { count: summary.changeCount })}
        </span>
        <span className="review-toolbar-counts diff-counts">
          <span className="diff-count-add">+{summary.additions}</span>
          <span className="diff-count-del">−{summary.deletions}</span>
        </span>
      </div>
      <div className="review-scroll">
        {groups.map((group, index) => (
          <ReviewTurnGroupView
            key={group.anchorId || `turn-${group.turnIndex}`}
            groups={groups}
            group={group}
            defaultOpen={index === groups.length - 1}
            running={running}
            refreshToken={refreshToken}
          />
        ))}
      </div>
    </div>
  );
}
