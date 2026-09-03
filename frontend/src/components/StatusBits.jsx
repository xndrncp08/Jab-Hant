const STATUS_STYLES = {
  New: "bg-signal-dim text-signal",
  Interested: "bg-paper text-muted border border-line",
  Applied: "bg-good-dim text-good",
  Interview: "bg-warn-dim text-warn",
  Rejected: "bg-bad-dim text-bad",
  Offer: "bg-good text-white",
  Archived: "bg-paper text-faint",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
        STATUS_STYLES[status] || "bg-paper text-muted"
      }`}
    >
      {status}
    </span>
  );
}

function scoreColor(score) {
  if (score === null || score === undefined) return "text-faint";
  if (score >= 80) return "text-good";
  if (score >= 60) return "text-signal";
  if (score >= 40) return "text-warn";
  return "text-bad";
}

function barColor(score) {
  if (score === null || score === undefined) return "bg-line";
  if (score >= 80) return "bg-good";
  if (score >= 60) return "bg-signal";
  if (score >= 40) return "bg-warn";
  return "bg-bad";
}

export function MatchScore({ score, size = "md" }) {
  const display = score === null || score === undefined ? "—" : Math.round(score);
  const textSize = size === "lg" ? "text-3xl" : "text-lg";
  return (
    <div className="flex flex-col items-end gap-1 w-16">
      <span className={`num font-semibold ${textSize} ${scoreColor(score)}`}>
        {display}
        {score !== null && score !== undefined && <span className="text-xs font-normal">%</span>}
      </span>
      <div className="w-full h-1 bg-line rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor(score)}`}
          style={{ width: `${Math.max(0, Math.min(100, score || 0))}%` }}
        />
      </div>
    </div>
  );
}
