import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusBadge, MatchScore } from "../components/StatusBits.jsx";

const STATUS_OPTIONS = [
  "New",
  "Interested",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
  "Archived",
];

export default function JobDetail() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getJob(id);
      setJob(data);
      setNotes(data.notes || "");
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status) {
    setSaving(true);
    try {
      const updated = await api.updateJob(id, { status });
      setJob(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveNotes() {
    setSaving(true);
    try {
      const updated = await api.updateJob(id, { notes });
      setJob(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (error)
    return (
      <p role="alert" className="text-ink text-sm">
        {error}
      </p>
    );
  if (!job) return <p className="text-highlight/75 text-sm">Loading…</p>;

  const salary =
    job.salary_min || job.salary_max
      ? `$${(job.salary_min || 0).toLocaleString()} – $${(job.salary_max || 0).toLocaleString()}`
      : null;

  return (
    <main className="max-w-3xl">
      <Link
        to="/"
        className="text-sm text-highlight/75 hover:text-ink focus-visible:ring-2 focus-visible:ring-highlight rounded"
      >
        ← Back to dashboard
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {job.title}
          </h1>
          <p className="text-highlight/75 mt-1">
            {job.company || "Unknown company"}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <StatusBadge status={job.status} />
            {salary && (
              <span className="text-sm text-highlight/75 num">{salary}</span>
            )}
            {job.employment_type && (
              <span className="text-sm text-highlight/75 capitalize">
                {job.employment_type}
              </span>
            )}
            {job.remote_type && job.remote_type !== "Unknown" && (
              <span className="text-sm text-highlight/75">
                {job.remote_type}
              </span>
            )}
          </div>
        </div>
        <MatchScore score={job.match_score} size="lg" />
      </div>

      <div className="flex gap-3 mb-6">
        {job.job_url ? (
          <a
            href={job.job_url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 border border-accent rounded text-sm font-medium text-ink hover:bg-accent/30 transition-colors focus-visible:ring-2 focus-visible:ring-highlight"
          >
            View listing
          </a>
        ) : null}
        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-highlight text-base rounded text-sm font-semibold hover:bg-highlight/90 active:bg-highlight/80 transition-colors focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
          >
            Apply directly
          </a>
        ) : (
          <span className="px-4 py-2 text-sm text-highlight/55 border border-dashed border-accent rounded">
            Application link unavailable
          </span>
        )}
      </div>

      {(job.reasons?.length > 0 || job.gaps?.length > 0) && (
        <section
          aria-label="Why this job matches"
          className="bg-surface border border-accent rounded p-5 mb-6"
        >
          <h2 className="font-display font-semibold text-sm mb-3 text-ink">
            Why this matches
          </h2>
          {job.reasons?.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {job.reasons.map((r, i) => (
                <li key={i} className="text-sm text-ink flex gap-2">
                  <span aria-hidden="true">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {job.gaps?.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-highlight/75 mb-2">
                Potential gaps
              </h3>
              <ul className="space-y-1.5">
                {job.gaps.map((g, i) => (
                  <li key={i} className="text-sm text-highlight/75 flex gap-2">
                    <span aria-hidden="true">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-highlight/55 mt-4">
            Match score and explanation are an automated estimate, not a
            guarantee of fit.
          </p>
        </section>
      )}

      {(job.matching_skills?.length > 0 || job.missing_skills?.length > 0) && (
        <section
          aria-label="Skills comparison"
          className="bg-surface border border-accent rounded p-5 mb-6"
        >
          <h2 className="font-display font-semibold text-sm mb-3 text-ink">
            Skills
          </h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.matching_skills.map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-1 rounded bg-highlight text-base font-medium"
              >
                ✓ {s}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.missing_skills.map((s) => (
              <span
                key={s}
                className="text-xs px-2 py-1 rounded bg-accent/40 text-ink border border-accent"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      <section
        aria-label="Application status"
        className="bg-surface border border-accent rounded p-5 mb-6"
      >
        <h2 className="font-display font-semibold text-sm mb-3 text-ink">
          Status
        </h2>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Set job status"
        >
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={saving}
              aria-pressed={job.status === s}
              className={`px-3 py-1.5 rounded text-sm transition-colors focus-visible:ring-2 focus-visible:ring-highlight ${
                job.status === s
                  ? "bg-highlight text-base font-semibold"
                  : "border border-accent text-highlight/85 hover:bg-accent/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section
        aria-label="Notes"
        className="bg-surface border border-accent rounded p-5 mb-6"
      >
        <label
          htmlFor="job-notes"
          className="block font-display font-semibold text-sm mb-3 text-ink"
        >
          Notes
        </label>
        <textarea
          id="job-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          aria-describedby="job-notes-hint"
          placeholder="Recruiter contact, interview date, application details…"
          className="w-full text-sm border border-accent rounded px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-highlight resize-none bg-paper text-ink placeholder:text-highlight/55"
        />
        <span id="job-notes-hint" className="sr-only">
          Notes save automatically when you click away from this field.
        </span>
      </section>

      {job.description && (
        <section
          aria-label="Full job description"
          className="bg-surface border border-accent rounded p-5"
        >
          <h2 className="font-display font-semibold text-sm mb-3 text-ink">
            Job description
          </h2>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">
            {job.description}
          </p>
        </section>
      )}
    </main>
  );
}
