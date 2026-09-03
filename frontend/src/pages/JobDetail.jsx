import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api/client.js";
import { StatusBadge, MatchScore } from "../components/StatusBits.jsx";

const STATUS_OPTIONS = ["New", "Interested", "Applied", "Interview", "Rejected", "Offer", "Archived"];

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

  if (error) return <div className="text-bad text-sm">{error}</div>;
  if (!job) return <div className="text-muted text-sm">Loading…</div>;

  const salary =
    job.salary_min || job.salary_max
      ? `$${(job.salary_min || 0).toLocaleString()} – $${(job.salary_max || 0).toLocaleString()}`
      : null;

  return (
    <div className="max-w-3xl">
      <Link to="/" className="text-sm text-muted hover:text-ink">
        ← Back to dashboard
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">{job.title}</h1>
          <p className="text-muted mt-1">
            {job.company || "Unknown company"}
            {job.location ? ` · ${job.location}` : ""}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <StatusBadge status={job.status} />
            {salary && <span className="text-sm text-muted num">{salary}</span>}
            {job.employment_type && (
              <span className="text-sm text-muted capitalize">{job.employment_type}</span>
            )}
            {job.remote_type && job.remote_type !== "Unknown" && (
              <span className="text-sm text-muted">{job.remote_type}</span>
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
            className="px-4 py-2 border border-line rounded text-sm font-medium hover:bg-paper transition-colors"
          >
            View listing
          </a>
        ) : null}
        {job.apply_url ? (
          <a
            href={job.apply_url}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-signal text-white rounded text-sm font-medium hover:bg-signal/90 transition-colors"
          >
            Apply directly
          </a>
        ) : (
          <span className="px-4 py-2 text-sm text-faint border border-dashed border-line rounded">
            Application link unavailable
          </span>
        )}
      </div>

      {(job.reasons?.length > 0 || job.gaps?.length > 0) && (
        <div className="bg-surface border border-line rounded p-5 mb-6">
          <h2 className="font-display font-semibold text-sm mb-3">Why this matches</h2>
          {job.reasons?.length > 0 && (
            <ul className="space-y-1.5 mb-4">
              {job.reasons.map((r, i) => (
                <li key={i} className="text-sm text-ink flex gap-2">
                  <span className="text-good">✓</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
          {job.gaps?.length > 0 && (
            <>
              <h3 className="text-xs font-medium text-muted mb-2">Potential gaps</h3>
              <ul className="space-y-1.5">
                {job.gaps.map((g, i) => (
                  <li key={i} className="text-sm text-muted flex gap-2">
                    <span className="text-warn">•</span>
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-xs text-faint mt-4">
            Match score and explanation are an automated estimate, not a guarantee of fit.
          </p>
        </div>
      )}

      {(job.matching_skills?.length > 0 || job.missing_skills?.length > 0) && (
        <div className="bg-surface border border-line rounded p-5 mb-6">
          <h2 className="font-display font-semibold text-sm mb-3">Skills</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {job.matching_skills.map((s) => (
              <span key={s} className="text-xs px-2 py-1 rounded bg-good-dim text-good">
                ✓ {s}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {job.missing_skills.map((s) => (
              <span key={s} className="text-xs px-2 py-1 rounded bg-warn-dim text-warn">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded p-5 mb-6">
        <h2 className="font-display font-semibold text-sm mb-3">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => updateStatus(s)}
              disabled={saving}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                job.status === s
                  ? "bg-signal text-white"
                  : "border border-line text-muted hover:bg-paper"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-line rounded p-5 mb-6">
        <h2 className="font-display font-semibold text-sm mb-3">Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          placeholder="Recruiter contact, interview date, application details…"
          className="w-full text-sm border border-line rounded px-3 py-2 outline-none focus:border-signal resize-none"
        />
      </div>

      {job.description && (
        <div className="bg-surface border border-line rounded p-5">
          <h2 className="font-display font-semibold text-sm mb-3">Job description</h2>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{job.description}</p>
        </div>
      )}
    </div>
  );
}
