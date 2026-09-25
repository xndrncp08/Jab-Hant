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
    <main>
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">
        Applications
      </h1>
      <p className="text-sm text-highlight/75 mb-6">
        Every job you've marked Applied, Interview, Rejected, or Offer.
      </p>

      <section
        aria-label="Tracked applications"
        className="bg-surface border border-accent rounded overflow-hidden"
      >
        {loading ? (
          <p className="px-5 py-10 text-center text-highlight/75 text-sm">
            Loading…
          </p>
        ) : jobs.length === 0 ? (
          <p className="px-5 py-10 text-center text-highlight/75 text-sm">
            Nothing tracked yet. Mark a job as Applied from its detail page to
            see it here.
          </p>
        ) : (
          jobs.map((job) => <JobRow key={job.id} job={job} />)
        )}
      </section>
    </main>
  );
}
