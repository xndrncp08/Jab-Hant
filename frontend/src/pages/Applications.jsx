import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import JobRow from "../components/JobRow.jsx";

export default function Applications() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listApplications()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Applications</h1>
      <p className="text-sm text-muted mb-6">
        Every job you've marked Applied, Interview, Rejected, or Offer.
      </p>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="px-5 py-10 text-center text-muted text-sm">Loading…</div>
        ) : jobs.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted text-sm">
            Nothing tracked yet. Mark a job as Applied from its detail page to see it here.
          </div>
        ) : (
          jobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </div>
    </div>
  );
}
