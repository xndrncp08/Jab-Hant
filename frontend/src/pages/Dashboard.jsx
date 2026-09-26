import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client.js";
import JobRow from "../components/JobRow.jsx";

const STATUS_OPTIONS = [
  "New",
  "Interested",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
  "Archived",
];
const REMOTE_OPTIONS = ["Remote", "Hybrid", "On-site"];
const POSTED_OPTIONS = [
  { label: "Past 24 hours", value: "1" },
  { label: "Past 3 days", value: "3" },
  { label: "Past week", value: "7" },
  { label: "Any time", value: "" },
];

function StatCard({ label, value }) {
  return (
    <div className="flex-1 bg-card border border-accent/70 rounded-lg shadow-card px-5 py-4">
      <div className="text-2xl font-display font-semibold num text-ink">
        {value}
      </div>
      <div className="text-sm text-highlight/75 mt-0.5">{label}</div>
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
    posted_within_days: "3",
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

  const inputCls =
    "px-3.5 py-2 text-sm bg-card border border-accent rounded-lg text-ink outline-none focus-visible:ring-2 focus-visible:ring-blue transition-shadow";

  return (
    <main>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-[28px] tracking-tight font-semibold text-ink">
            Dashboard
          </h1>
          {lastSearch && (
            <p className="text-sm text-highlight/75 mt-1">
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
          aria-label="Run a job search now"
          className="px-4 py-2 bg-blue text-white text-sm font-semibold rounded-lg hover:bg-blue/90 active:bg-blue/80 active:scale-[0.98] disabled:opacity-50 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          {searching ? "Searching…" : "Run search now"}
        </button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-5 px-4 py-3 bg-red/10 text-red text-sm rounded-lg border border-red/20"
        >
          {error}
        </p>
      )}

      <section aria-label="Summary statistics" className="flex gap-3 mb-7">
        <StatCard label="New" value={counts.New || 0} />
        <StatCard label="Interested" value={counts.Interested || 0} />
        <StatCard label="Applied" value={counts.Applied || 0} />
        <StatCard label="Interview" value={counts.Interview || 0} />
        <StatCard label="Offer" value={counts.Offer || 0} />
      </section>

      <section aria-label="Filter jobs" className="flex flex-wrap gap-2 mb-4">
        <label className="sr-only" htmlFor="job-search-text">
          Search title or company
        </label>
        <input
          id="job-search-text"
          type="text"
          placeholder="Search title or company"
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          className={`${inputCls} placeholder:text-highlight/55 w-56`}
        />
        <label className="sr-only" htmlFor="filter-status">
          Filter by status
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: e.target.value }))
          }
          className={inputCls}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-remote">
          Filter by location type
        </label>
        <select
          id="filter-remote"
          value={filters.remote_type}
          onChange={(e) =>
            setFilters((f) => ({ ...f, remote_type: e.target.value }))
          }
          className={inputCls}
        >
          <option value="">Any location type</option>
          {REMOTE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="filter-match">
          Filter by minimum match score
        </label>
        <select
          id="filter-match"
          value={filters.min_match}
          onChange={(e) =>
            setFilters((f) => ({ ...f, min_match: e.target.value }))
          }
          className={inputCls}
        >
          <option value="">Any match score</option>
          <option value="80">80%+</option>
          <option value="60">60%+</option>
          <option value="40">40%+</option>
        </select>
        <label className="sr-only" htmlFor="filter-posted">
          Filter by date posted
        </label>
        <select
          id="filter-posted"
          value={filters.posted_within_days}
          onChange={(e) =>
            setFilters((f) => ({ ...f, posted_within_days: e.target.value }))
          }
          className={inputCls}
        >
          {POSTED_OPTIONS.map((o) => (
            <option key={o.label} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      <section
        aria-label="Job listings"
        className="bg-card border border-accent/70 rounded-lg shadow-card overflow-hidden"
      >
        {loading ? (
          <p className="px-5 py-10 text-center text-highlight/75 text-sm">
            Loading jobs…
          </p>
        ) : jobs.length === 0 ? (
          <p className="px-5 py-10 text-center text-highlight/75 text-sm">
            No jobs match these filters yet. Upload a resume in Settings and run
            a search to get started.
          </p>
        ) : (
          jobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </section>
    </main>
  );
}
