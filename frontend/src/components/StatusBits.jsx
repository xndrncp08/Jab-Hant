/*
 * Status is communicated by ICON + TEXT, not color hue — the style guide's
 * 4-color palette doesn't give us distinct hues to spend on New vs.
 * Applied vs. Rejected vs. Offer the way a typical status-color system
 * would. This is actually the more accessible choice regardless (WCAG
 * 1.4.1 "Use of Color" specifically warns against color being the *only*
 * way information is conveyed) — a colorblind user or someone on a
 * grayscale display still gets the status from the icon/text alone.
 */
const STATUS_ICON = {
  New: "●",
  Interested: "☆",
  Applied: "↗",
  Interview: "◐",
  Rejected: "✕",
  Offer: "★",
  Archived: "▢",
};

export function StatusBadge({ status }) {
  const isEmphasized = status === "Offer" || status === "New";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
        isEmphasized
          ? "bg-highlight text-base border-highlight"
          : "bg-accent/30 text-ink border-accent"
      }`}
    >
      <span aria-hidden="true">{STATUS_ICON[status] || "•"}</span>
      {status}
    </span>
  );
}

export function MatchScore({ score, size = "md" }) {
  const display =
    score === null || score === undefined ? "—" : Math.round(score);
  const textSize = size === "lg" ? "text-3xl" : "text-lg";
  const label =
    score === null || score === undefined
      ? "Match score not available"
      : `Estimated match score: ${Math.round(score)} percent`;

  return (
    <div
      className="flex flex-col items-end gap-1 w-16"
      role="img"
      aria-label={label}
    >
      <span
        className={`num font-semibold ${textSize} text-ink`}
        aria-hidden="true"
      >
        {display}
        {score !== null && score !== undefined && (
          <span className="text-xs font-normal">%</span>
        )}
      </span>
      <div
        className="w-full h-1 bg-accent/40 rounded-full overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-full bg-highlight"
          style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }}
        />
      </div>
    </div>
  );
}
