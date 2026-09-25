import { useEffect, useState } from "react";
import { api } from "../api/client.js";

function KeywordBar({ skill, count, max }) {
  const width = Math.max(6, (count / max) * 100);
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm w-32 shrink-0 truncate text-ink">{skill}</span>
      <div className="flex-1 h-2 bg-accent/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-highlight rounded-full"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs num text-highlight/75 w-6 text-right">
        {count}
      </span>
    </div>
  );
}

export default function Insights() {
  const [keywords, setKeywords] = useState(null);
  const [matches, setMatches] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .keywordAnalytics()
      .then(setKeywords)
      .catch(() => {});
    api
      .matchAnalytics()
      .then(setMatches)
      .catch(() => {});
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generateImprovementPrompt();
      setPrompt(res.prompt);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const maxCount = keywords?.most_requested?.[0]?.count || 1;

  return (
    <main className="max-w-3xl">
      <h1 className="font-display text-2xl font-semibold text-ink mb-1">
        Insights
      </h1>
      <p className="text-sm text-highlight/75 mb-6">
        What the jobs you've found are asking for, and a prompt to help you
        tailor your resume.
      </p>

      {matches && (
        <section
          aria-label="Match score distribution"
          className="bg-surface border border-accent rounded p-5 mb-6"
        >
          <h2 className="font-display font-semibold text-sm mb-3 text-ink">
            Match distribution
          </h2>
          <div className="flex gap-4 text-sm num">
            <div>
              <div className="text-2xl font-semibold text-ink">
                {matches.buckets["90-100"]}
              </div>
              <div className="text-xs text-highlight/75 mt-0.5 font-body">
                90–100%
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-ink">
                {matches.buckets["75-89"]}
              </div>
              <div className="text-xs text-highlight/75 mt-0.5 font-body">
                75–89%
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-ink">
                {matches.buckets["50-74"]}
              </div>
              <div className="text-xs text-highlight/75 mt-0.5 font-body">
                50–74%
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-ink">
                {matches.buckets["0-49"]}
              </div>
              <div className="text-xs text-highlight/75 mt-0.5 font-body">
                Below 50%
              </div>
            </div>
          </div>
          <p className="text-xs text-highlight/55 mt-3">
            Average match score: {matches.average_match_score}% across{" "}
            {matches.total_scored_jobs} jobs
          </p>
        </section>
      )}

      {keywords && keywords.most_requested.length > 0 && (
        <section
          aria-label="Most requested skills"
          className="bg-surface border border-accent rounded p-5 mb-6"
        >
          <h2 className="font-display font-semibold text-sm mb-4 text-ink">
            Most requested skills
          </h2>
          <div className="space-y-0.5">
            {keywords.most_requested.map((k) => (
              <KeywordBar
                key={k.skill}
                skill={k.skill}
                count={k.count}
                max={maxCount}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-accent">
            <div>
              <h3 className="text-xs font-medium text-highlight/75 mb-2">
                Strongly represented
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.strongly_represented.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-1 rounded bg-highlight text-base font-medium"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-highlight/75 mb-2">
                Underrepresented
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.underrepresented.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-1 rounded bg-accent/40 text-ink border border-accent"
                  >
                    ⚠ {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-highlight/75 mb-2">
                Not currently found
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.not_found.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-1 rounded border border-dashed border-accent text-highlight/75"
                  >
                    ⚠ {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        aria-label="Resume improvement prompt generator"
        className="bg-surface border border-accent rounded p-5"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-sm text-ink">
            Resume improvement prompt
          </h2>
          <button
            onClick={handleGenerate}
            disabled={generating}
            aria-label="Generate resume improvement prompt"
            className="px-3 py-1.5 bg-highlight text-base text-sm font-semibold rounded hover:bg-highlight/90 active:bg-highlight/80 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            {generating ? "Generating…" : "Generate prompt"}
          </button>
        </div>
        <p className="text-sm text-highlight/75 mb-3">
          Paste this into ChatGPT, Claude, or any AI model to get specific
          suggestions for tailoring your resume to the jobs you've found.
          Nothing is sent automatically — you control what gets shared.
        </p>
        {error && (
          <p role="alert" className="text-sm text-ink mb-3">
            {error}
          </p>
        )}
        {prompt && (
          <>
            <label htmlFor="improvement-prompt-output" className="sr-only">
              Generated resume improvement prompt
            </label>
            <textarea
              id="improvement-prompt-output"
              readOnly
              value={prompt}
              rows={12}
              className="w-full text-xs font-mono border border-accent rounded px-3 py-2 bg-paper text-ink resize-none focus-visible:ring-2 focus-visible:ring-highlight"
            />
            <button
              onClick={handleCopy}
              aria-label="Copy resume improvement prompt to clipboard"
              className="mt-2 px-3 py-1.5 border border-accent rounded text-sm font-medium text-ink hover:bg-accent/30 transition-colors focus-visible:ring-2 focus-visible:ring-highlight"
            >
              {copied ? "Copied" : "Copy prompt"}
            </button>
          </>
        )}
      </section>
    </main>
  );
}
