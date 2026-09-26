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
    <main>
      <h1 className="font-display text-[28px] tracking-tight font-semibold text-ink mb-1">
        Search history
      </h1>
      <p className="text-sm text-highlight/75 mb-6">
        Every scheduled and manual search run, with results and any errors.
      </p>

      {selected ? (
        <div>
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-highlight/75 hover:text-ink mb-4 focus-visible:ring-2 focus-visible:ring-blue rounded transition-colors"
          >
            ← Back to history
          </button>
          <section
            aria-label="Search run details"
            className="bg-card border border-accent/70 rounded-lg shadow-card p-5 mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-display font-semibold text-ink">
                  {formatDateTime(selected.started_at)}
                </span>
                <span className="ml-2 text-xs text-highlight/55 uppercase">
                  {selected.trigger}
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full border border-accent text-ink">
                {selected.status}
              </span>
            </div>
            <div className="flex gap-6 text-sm num mb-3 text-ink">
              <span>
                <span className="text-highlight/75">Scanned </span>
                {selected.jobs_scanned}
              </span>
              <span>
                <span className="text-highlight/75">New </span>
                {selected.new_jobs}
              </span>
              <span>
                <span className="text-highlight/75">Duplicates </span>
                {selected.duplicate_jobs}
              </span>
              <span>
                <span className="text-highlight/75">Errors </span>
                {selected.errors?.length || 0}
              </span>
            </div>
            {selected.sources && Object.keys(selected.sources).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {Object.entries(selected.sources).map(([source, status]) => (
                  <span
                    key={source}
                    className="text-xs px-2 py-0.5 rounded-full border border-accent text-highlight/85"
                  >
                    {source}: {status}
                  </span>
                ))}
              </div>
            )}
            {selected.errors?.length > 0 && (
              <div className="mt-3 text-xs text-highlight/75 space-y-1">
                {selected.errors.map((e, i) => (
                  <div key={i}>
                    {e.source}: {e.error}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section
            aria-label="Jobs from this search"
            className="bg-card border border-accent/70 rounded-lg shadow-card overflow-hidden"
          >
            {selected.jobs?.length > 0 ? (
              selected.jobs.map((job) => <JobRow key={job.id} job={job} />)
            ) : (
              <p className="px-5 py-8 text-center text-highlight/75 text-sm">
                No new jobs were saved in this run.
              </p>
            )}
          </section>
        </div>
      ) : loading ? (
        <p className="text-highlight/75 text-sm">Loading…</p>
      ) : searches.length === 0 ? (
        <p className="bg-card border border-accent/70 rounded-lg shadow-card px-5 py-10 text-center text-highlight/75 text-sm">
          No searches yet. Run one from the Dashboard.
        </p>
      ) : (
        <section
          aria-label="Search history list"
          className="bg-card border border-accent/70 rounded-lg shadow-card overflow-hidden"
        >
          {searches.map((s) => (
            <button
              key={s.id}
              onClick={() => openSearch(s.id)}
              className="w-full flex items-center justify-between px-5 py-4 border-b border-accent/50 last:border-0 hover:bg-accent/20 transition-colors duration-150 text-left focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-inset"
            >
              <div>
                <div className="font-medium text-sm text-ink">
                  {formatDateTime(s.started_at)}
                </div>
                <div className="text-xs text-highlight/55 uppercase mt-0.5">
                  {s.trigger}
                </div>
              </div>
              <div className="flex gap-5 text-sm num text-highlight/85">
                <span>{s.jobs_scanned} scanned</span>
                <span className="text-ink font-medium">{s.new_jobs} new</span>
                <span>{s.duplicate_jobs} dup</span>
              </div>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}
