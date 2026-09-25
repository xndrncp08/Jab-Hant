import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-accent px-6 py-4">
        <nav aria-label="Legal pages">
          <Link
            to="/"
            className="text-sm text-highlight/75 hover:text-ink focus-visible:ring-2 focus-visible:ring-highlight rounded"
          >
            ← Back to app
          </Link>
        </nav>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="font-display text-2xl font-semibold mb-1">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm text-highlight/55 mb-8">
          Last updated: reflects the app as built — update this date whenever
          you materially change what the app does.
        </p>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">Scope</h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            This is a personal, self-hosted tool. These terms describe the
            relationship between whoever deploys an instance of this app ("you")
            and the people who use it. If you're the only person using your own
            deployment, these terms mostly exist so a version of them is in
            place before you ever add anyone else.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            No warranty
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            This software is provided as-is. Job search results, match scores,
            and any generated text are estimates and suggestions — not
            guarantees of accuracy, completeness, or fitness for any particular
            purpose. Job board data (titles, descriptions, salaries, application
            links) comes from third-party sites via automated scraping (JobSpy)
            and may be incomplete, outdated, or occasionally wrong; always
            verify details on the original listing before acting on them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Acceptable use of job board data
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            Automated searching of job boards is subject to each board's own
            terms of service. You're responsible for how you configure and run
            search volume/frequency on your deployment, and for complying with
            the terms of any site this app queries on your behalf.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Limitation of liability
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            To the fullest extent permitted by law, whoever operates a given
            deployment of this app is not liable for decisions made based on its
            output — including job applications submitted, resume changes made
            from a generated improvement prompt, or any consequence of relying
            on match scores or extracted data.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg mb-2">
            Not legal advice
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            This page is a starting template, not a substitute for review by a
            qualified lawyer — particularly before relying on it in any context
            beyond personal, single-user use.
          </p>
        </section>
      </main>
    </div>
  );
}
