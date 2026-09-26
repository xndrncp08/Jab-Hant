/*
 * Status is communicated by ICON + TEXT + color together. Color alone never
 * carries the meaning (WCAG 1.4.1 "Use of Color") — the icon and label are
 * always present too, so a colorblind user or a grayscale display still
 * gets the full status from the glyph/text alone.
 *
 * Class names below are written out in full (not built with template
 * literals) because Tailwind's build statically scans source text for
 * class-shaped strings — a dynamically interpolated `bg-${color}` would
 * never make it into the generated CSS.
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

const TINTED_BADGE = {
  blue: "bg-blue/10 text-blue border-blue/25",
  purple: "bg-purple/10 text-purple border-purple/25",
  orange: "bg-orange/10 text-orange border-orange/25",
  red: "bg-red/10 text-red border-red/25",
  green: "bg-green/10 text-green border-green/25",
  gray: "bg-accent/50 text-highlight/85 border-accent",
};

const SOLID_BADGE = {
  blue: "bg-blue text-white border-blue",
  green: "bg-green text-white border-green",
};

const STATUS_BADGE_CLASS = {
  New: SOLID_BADGE.blue,
  Interested: TINTED_BADGE.purple,
  Applied: TINTED_BADGE.orange,
  Interview: TINTED_BADGE.orange,
  Rejected: TINTED_BADGE.red,
  Offer: SOLID_BADGE.green,
  Archived: TINTED_BADGE.gray,
};

export function StatusBadge({ status }) {
  const cls = STATUS_BADGE_CLASS[status] || TINTED_BADGE.gray;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}
    >
      <span aria-hidden="true">{STATUS_ICON[status] || "•"}</span>
      {status}
    </span>
  );
}

const SCORE_TEXT_CLASS = {
  green: "text-green",
  blue: "text-blue",
  orange: "text-orange",
  red: "text-red",
  none: "text-highlight/75",
};

const SCORE_BAR_CLASS = {
  green: "bg-green",
  blue: "bg-blue",
  orange: "bg-orange",
  red: "bg-red",
  none: "bg-highlight/50",
};

function scoreKey(score) {
  if (score === null || score === undefined) return "none";
  if (score >= 80) return "green";
  if (score >= 60) return "blue";
  if (score >= 40) return "orange";
  return "red";
}

export function MatchScore({ score, size = "md" }) {
  const display =
    score === null || score === undefined ? "—" : Math.round(score);
  const textSize = size === "lg" ? "text-3xl" : "text-lg";
  const key = scoreKey(score);
  const label =
    score === null || score === undefined
      ? "Match score not available"
      : `Estimated match score: ${Math.round(score)} percent`;

  return (
    <div
      className="flex flex-col items-end gap-1.5 w-16"
      role="img"
      aria-label={label}
    >
      <span
        className={`num font-semibold ${textSize} ${SCORE_TEXT_CLASS[key]}`}
        aria-hidden="true"
      >
        {display}
        {score !== null && score !== undefined && (
          <span className="text-xs font-normal">%</span>
        )}
      </span>
      <div
        className="w-full h-1.5 bg-accent/50 rounded-full overflow-hidden"
        aria-hidden="true"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-spring ${SCORE_BAR_CLASS[key]}`}
          style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }}
        />
      </div>
    </div>
  );
}
