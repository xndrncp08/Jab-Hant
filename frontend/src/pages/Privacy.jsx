import { Link } from "react-router-dom";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-accent px-6 py-4">
        <nav aria-label="Legal pages">
          <Link
            to="/"
            className="text-sm text-highlight/75 hover:text-ink focus-visible:ring-2 focus-visible:ring-blue rounded transition-colors"
          >
            ← Back to app
          </Link>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-[28px] tracking-tight font-semibold mb-1">
          Privacy Policy
        </h1>
        <p className="text-sm text-highlight/55 mb-8">
          Last updated: reflects the app as built — update this date whenever
          you materially change what the app does.
        </p>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            What this app is
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            Job Hunter is a personal job-search tool. It was built to run on one
            person's own machine or private server, for that one person's own
            use — not as a multi-user product with a company operating it on
            your behalf. Whoever deploys this instance (you) is the one who
            controls the data in it; there is no separate operator collecting or
            processing your information.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            What data is stored, and where
          </h2>
          <ul className="text-sm text-highlight/85 leading-relaxed list-disc pl-5 space-y-1.5">
            <li>
              Your uploaded resume (PDF) and the text/skills extracted from it,
              in a local SQLite database and files on the server this app is
              deployed to.
            </li>
            <li>
              Job postings found via search, and any notes/status you add to
              them, in the same local database.
            </li>
            <li>
              Vector embeddings of your resume and job descriptions, used for
              match scoring, stored in a local ChromaDB store on the same
              server.
            </li>
            <li>
              A login credential for the current browser session (see "Cookies
              &amp; local storage" below).
            </li>
          </ul>
          <p className="text-sm text-highlight/85 leading-relaxed mt-3">
            None of this is sent to a third-party analytics service, ad network,
            or data broker by this app. It stays on the server you (or whoever
            runs this instance) control.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Where data leaves this server
          </h2>
          <ul className="text-sm text-highlight/85 leading-relaxed list-disc pl-5 space-y-1.5">
            <li>
              Job search queries (your search terms and location, not your
              resume) are sent to public job boards (Indeed, LinkedIn,
              Glassdoor, ZipRecruiter, Google Jobs) via the JobSpy library, the
              same way a browser visiting those sites would.
            </li>
            <li>
              The embedding model used for match scoring runs locally after its
              one-time download — it does not send your resume or job data
              anywhere.
            </li>
            <li>
              If an optional external AI API is explicitly configured (it is off
              by default), resume/job text could be sent to that provider. This
              app never does so without that explicit configuration.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Cookies &amp; local storage
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            See the{" "}
            <Link
              to="/cookies"
              className="underline text-blue hover:text-blue/80 focus-visible:ring-2 focus-visible:ring-blue rounded"
            >
              Cookie Policy
            </Link>{" "}
            for the specifics. In short: this app does not set tracking cookies.
            It uses your browser's sessionStorage to hold your login credential
            for the current browser session, and localStorage to remember your
            cookie-consent choice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Your control over this data
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            Because this is a self-hosted personal tool, you have direct access
            to delete any of it at any time — remove the resume file, delete
            rows from the database, or wipe the entire{" "}
            <code className="text-xs bg-accent/40 px-1 py-0.5 rounded">
              data/
            </code>{" "}
            directory to start over.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg mb-2">
            Not legal advice
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            This page describes, factually, what the current version of this app
            does. It is not a substitute for review by a qualified lawyer,
            especially if you plan to deploy this somewhere other people's data
            will pass through it, or in a jurisdiction with specific
            data-protection requirements (GDPR, CCPA, etc.).
          </p>
        </section>
      </main>
    </div>
  );
}
