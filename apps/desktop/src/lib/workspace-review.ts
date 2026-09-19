// Review turn grouping lives in @pi-desktop/shared; this module stays as the
// renderer-facing re-export so existing imports keep working.
export {
  groupReviewChangesByTurn,
  reviewChangeFromMessage,
  reviewChangesFromMessages,
  summarizeReviewChanges,
  withReviewChangeState,
  type ReviewChangeEntry,
  type ReviewChangesSummary,
  type ReviewTurnGroup,
} from "@pi-desktop/shared";
