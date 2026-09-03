import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import JobRow from "../components/JobRow.jsx";

const STATUS_OPTIONS = ["New", "Interested", "Applied", "Interview", "Rejected", "Offer", "Archived"];
const REMOTE_OPTIONS = ["Remote", "Hybrid", "On-site"];

function StatCard({ label, value }) {
  return (
    <div className="flex-1 bg-surface border border-line rounded px-5 py-4">
      <div className="text-2xl font-display font-semibold num">{value}</div>
      <div className="text-sm text-muted mt-0.5">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: "",
    min_match: "",
    remote_type: "",
    q: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, countsRes, historyRes] = await Promise.all([
        api.listJobs(filters),
        api.jobCounts(),
        api.searchHistory(),
      ]);
      setJobs(jobsRes);
      setCounts(countsRes);
      setLastSearch(historyRes[0] || null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRunSearch() {
    setSearching(true);
    setError(null);
    try {
      await api.runSearch();
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          {lastSearch && (
            <p className="text-sm text-muted mt-1">
              Last search:{" "}
              {lastSearch.completed_at
                ? new Date(lastSearch.completed_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "in progress…"}
            </p>
          )}
        </div>
        <button
          onClick={handleRunSearch}
          disabled={searching}
          className="px-4 py-2 bg-signal text-white text-sm font-medium rounded hover:bg-signal/90 disabled:opacity-50 transition-colors"
        >
          {searching ? "Searching…" : "Run search now"}
        </button>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-bad-dim text-bad text-sm rounded border border-bad/20">
          {error}
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <StatCard label="New" value={counts.New || 0} />
        <StatCard label="Interested" value={counts.Interested || 0} />
        <StatCard label="Applied" value={counts.Applied || 0} />
        <StatCard label="Interview" value={counts.Interview || 0} />
        <StatCard label="Offer" value={counts.Offer || 0} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Search title or company"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded outline-none focus:border-signal w-56"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded outline-none focus:border-signal"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={filters.remote_type}
          onChange={(e) => setFilters((f) => ({ ...f, remote_type: e.target.value }))}
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded outline-none focus:border-signal"
        >
          <option value="">Any location type</option>
          {REMOTE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={filters.min_match}
          onChange={(e) => setFilters((f) => ({ ...f, min_match: e.target.value }))}
          className="px-3 py-1.5 text-sm bg-surface border border-line rounded outline-none focus:border-signal"
        >
          <option value="">Any match score</option>
          <option value="80">80%+</option>
          <option value="60">60%+</option>
          <option value="40">40%+</option>
        </select>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-muted text-sm">Loading jobs…</div>
        ) : jobs.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted text-sm">
            No jobs match these filters yet. Upload a resume in Settings and run a search to get
            started.
          </div>
        ) : (
          jobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}
