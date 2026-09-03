import { Link } from "react-router-dom";
import { StatusBadge, MatchScore } from "./StatusBits.jsx";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function JobRow({ job }) {
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="flex items-center gap-4 px-5 py-4 border-b border-line last:border-0 hover:bg-paper transition-colors group"
    >
      {job.is_new && <span className="w-1.5 h-1.5 rounded-full bg-signal shrink-0" />}
      {!job.is_new && <span className="w-1.5 h-1.5 shrink-0" />}

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h3 className="font-medium text-[15px] text-ink truncate">{job.title}</h3>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-sm text-muted truncate mt-0.5">
          {job.company || "Unknown company"}
          {job.location ? ` · ${job.location}` : ""}
          {job.remote_type && job.remote_type !== "Unknown" ? ` · ${job.remote_type}` : ""}
        </p>
      </div>

      <div className="text-xs text-faint num shrink-0 w-16 text-right">
        {formatDate(job.date_discovered)}
      </div>

      <MatchScore score={job.match_score} />
    </Link>
  );
}
