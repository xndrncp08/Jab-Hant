import { Link } from "react-router-dom";

export default function CookiePolicy() {
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
          Cookie Policy
        </h1>
        <p className="text-sm text-highlight/55 mb-8">
          Last updated: reflects the app as built — update this date whenever
          you materially change what the app does.
        </p>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            This app does not use cookies
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            As built, this app sets no HTTP cookies at all — no tracking
            cookies, no analytics cookies, no third-party advertising cookies.
            It uses two browser storage mechanisms instead, described below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            What it does store, and why
          </h2>
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-accent">
                <th scope="col" className="py-2 pr-4 font-medium text-ink">
                  Storage
                </th>
                <th scope="col" className="py-2 pr-4 font-medium text-ink">
                  Purpose
                </th>
                <th scope="col" className="py-2 font-medium text-ink">
                  Lifetime
                </th>
              </tr>
            </thead>
            <tbody className="text-highlight/85">
              <tr className="border-b border-accent/50">
                <td className="py-2 pr-4">sessionStorage</td>
                <td className="py-2 pr-4">
                  Holds your login credential so you don't have to re-enter it
                  on every page.
                </td>
                <td className="py-2">
                  Cleared when you close the browser tab/window.
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4">localStorage</td>
                <td className="py-2 pr-4">
                  Remembers your cookie-consent choice (necessary-only vs. all)
                  so you aren't asked every visit.
                </td>
                <td className="py-2">
                  Persists until you clear browser storage or change your
                  choice.
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-sm text-highlight/85 leading-relaxed mt-4">
            Both are "necessary" in the sense that the login mechanism and the
            consent banner itself can't function without them — they're not
            optional/tracking storage, and they're never sent to any third
            party.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="font-display font-semibold text-lg mb-2">
            Optional storage (currently unused)
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            The consent banner's "Accept all" option exists for optional
            features this app doesn't currently have — for example, if usage
            analytics or a third-party embed were added later. Choosing "Accept
            necessary only" keeps those off; as of this version, there is
            nothing optional actually running either way, so both choices
            currently behave identically in practice. The infrastructure is in
            place so that changes, not the behavior, if that ever changes.
          </p>
        </section>

        <section>
          <h2 className="font-display font-semibold text-lg mb-2">
            Managing storage yourself
          </h2>
          <p className="text-sm text-highlight/85 leading-relaxed">
            You can clear sessionStorage and localStorage for this site at any
            time through your browser's settings (typically under Privacy / Site
            Data), or by closing the tab for sessionStorage specifically. See
            the{" "}
            <Link
              to="/privacy"
              className="underline text-blue hover:text-blue/80 focus-visible:ring-2 focus-visible:ring-blue rounded"
            >
              Privacy Policy
            </Link>{" "}
            for how server-side data (your resume, jobs, etc.) is stored and how
            to remove it.
          </p>
        </section>
      </main>
    </div>
  );
}
