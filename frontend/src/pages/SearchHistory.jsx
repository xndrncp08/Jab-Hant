import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import JobRow from "../components/JobRow.jsx";

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SearchHistory() {
  const [searches, setSearches] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .searchHistory()
      .then(setSearches)
      .finally(() => setLoading(false));
  }, []);

  async function openSearch(id) {
    const detail = await api.getSearch(id);
    setSelected(detail);
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Search history</h1>
      <p className="text-sm text-muted mb-6">
        Every scheduled and manual search run, with results and any errors.
      </p>

      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-muted hover:text-ink mb-4"
          >
            ← Back to history
          </button>
          <div className="bg-surface border border-line rounded p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display font-semibold">
                  {formatDateTime(selected.started_at)}
                </span>
                <span className="ml-2 text-xs text-faint uppercase">{selected.trigger}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  selected.status === "completed"
                    ? "bg-good-dim text-good"
                    : selected.status === "failed"
                    ? "bg-bad-dim text-bad"
                    : "bg-warn-dim text-warn"
                }`}
              >
                {selected.status}
              </span>
            </div>
            <div className="flex gap-6 text-sm num mb-3">
              <span>
                <span className="text-muted">Scanned </span>
                {selected.jobs_scanned}
              </span>
              <span>
                <span className="text-muted">New </span>
                {selected.new_jobs}
              </span>
              <span>
                <span className="text-muted">Duplicates </span>
                {selected.duplicate_jobs}
              </span>
              <span>
                <span className="text-muted">Errors </span>
                {selected.errors?.length || 0}
              </span>
            </div>
            {selected.sources && Object.keys(selected.sources).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(selected.sources).map(([source, status]) => (
                  <span
                    key={source}
                    className={`text-xs px-2 py-0.5 rounded ${
                      status === "Success" ? "bg-good-dim text-good" : "bg-bad-dim text-bad"
                    }`}
                  >
                    {source}: {status}
                  </span>
                ))}
              </div>
            )}
            {selected.errors?.length > 0 && (
              <div className="mt-3 text-xs text-bad space-y-1">
                {selected.errors.map((e, i) => (
                  <div key={i}>
                    {e.source}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-surface border border-line rounded overflow-hidden">
            {selected.jobs?.length > 0 ? (
              selected.jobs.map((job) => <JobRow key={job.id} job={job} />)
            ) : (
              <div className="px-5 py-8 text-center text-muted text-sm">
                No new jobs were saved in this run.
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="text-muted text-sm">Loading…</div>
      ) : searches.length === 0 ? (
        <div className="bg-surface border border-line rounded px-5 py-10 text-center text-muted text-sm">
          No searches yet. Run one from the Dashboard.
        </div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          {searches.map((s) => (
            <button
              key={s.id}
              onClick={() => openSearch(s.id)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-line last:border-0 hover:bg-paper transition-colors text-left"
            >
              <div>
                <div className="font-medium text-sm">{formatDateTime(s.started_at)}</div>
                <div className="text-xs text-faint uppercase mt-0.5">{s.trigger}</div>
              </div>
              <div className="flex gap-5 text-sm num text-muted">
                <span>{s.jobs_scanned} scanned</span>
                <span className="text-signal">{s.new_jobs} new</span>
                <span>{s.duplicate_jobs} dup</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
