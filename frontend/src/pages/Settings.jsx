import { useEffect, useState, useRef } from "react";
import { api } from "../api/client.js";

function Field({ label, htmlFor, children, hint }) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink mb-1"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-highlight/55 mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section
      aria-label={title}
      className="bg-card border border-accent/70 rounded-lg shadow-card p-5 mb-6"
    >
      <h2 className="font-display font-semibold text-sm mb-4 text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 text-sm border border-accent rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-blue bg-base text-ink placeholder:text-highlight/55 transition-shadow";

export default function Settings() {
  const [resume, setResume] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [termsText, setTermsText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    Promise.all([api.getResume().catch(() => null), api.getSettings()]).then(
      ([resumeRes, settingsRes]) => {
        setResume(resumeRes);
        setSettings(settingsRes);
        const existingTerms = settingsRes.search_terms || [];
        if (existingTerms.length > 0) {
          setTermsText(existingTerms.join("\n"));
        } else if (resumeRes?.search_keywords?.length) {
          setTermsText(resumeRes.search_keywords.join("\n"));
        }
      },
    );
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadResume(file);
      setResume(res);
      if (!termsText.trim()) {
        setTermsText((res.search_keywords || []).join("\n"));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function updateField(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const values = {
        ...settings,
        search_terms: termsText
          .split("\n")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      const updated = await api.updateSettings(values);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-highlight/75 text-sm">Loading…</p>;

  return (
    <main className="max-w-2xl">
      <h1 className="font-display text-[28px] tracking-tight font-semibold text-ink mb-6">
        Settings
      </h1>

      {error && (
        <p
          role="alert"
          className="mb-5 px-4 py-3 bg-red/10 text-red text-sm rounded-lg border border-red/20"
        >
          {error}
        </p>
      )}

      <Section title="Resume">
        {resume ? (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-ink">{resume.filename}</p>
              <p className="text-xs text-highlight/75 mt-0.5">
                {resume.skills?.length || 0} skills detected ·{" "}
                {resume.search_keywords?.length || 0} search terms suggested
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-highlight/75 mb-3">
            No resume uploaded yet.
          </p>
        )}
        <label htmlFor="resume-upload" className="sr-only">
          Upload resume PDF
        </label>
        <input
          id="resume-upload"
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          aria-label={resume ? "Upload a new resume PDF" : "Upload resume PDF"}
          className="px-4 py-2 border border-accent rounded-lg text-sm font-medium text-ink hover:bg-accent/30 active:scale-[0.98] transition-all duration-150 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-blue"
        >
          {uploading
            ? "Uploading…"
            : resume
              ? "Upload new resume"
              : "Upload resume (PDF)"}
        </button>
      </Section>

      <Section title="Search">
        <Field label="Location" htmlFor="settings-location">
          <input
            id="settings-location"
            className={inputCls}
            value={settings.search_location || ""}
            onChange={(e) => updateField("search_location", e.target.value)}
          />
        </Field>
        <Field label="Country" htmlFor="settings-country">
          <input
            id="settings-country"
            className={inputCls}
            value={settings.search_country || ""}
            onChange={(e) => updateField("search_country", e.target.value)}
          />
        </Field>
        <Field label="Search distance (miles)" htmlFor="settings-distance">
          <input
            id="settings-distance"
            type="number"
            className={inputCls}
            value={settings.search_distance || 0}
            onChange={(e) =>
              updateField("search_distance", Number(e.target.value))
            }
          />
        </Field>
        <Field
          label="Search terms"
          htmlFor="settings-terms"
          hint="One per line. Seeded from your resume — edit freely."
        >
          <textarea
            id="settings-terms"
            rows={6}
            className={`${inputCls} font-mono resize-none`}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />
        </Field>
        <Field
          label="Minimum match score to save a job"
          htmlFor="settings-min-match"
        >
          <input
            id="settings-min-match"
            type="number"
            min={0}
            max={100}
            className={inputCls}
            value={settings.min_match_score || 0}
            onChange={(e) =>
              updateField("min_match_score", Number(e.target.value))
            }
          />
        </Field>
      </Section>

      <Section title="Schedule">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Morning" htmlFor="settings-morning">
            <input
              id="settings-morning"
              type="time"
              className={inputCls}
              value={settings.schedule_morning || "08:00"}
              onChange={(e) => updateField("schedule_morning", e.target.value)}
            />
          </Field>
          <Field label="Afternoon" htmlFor="settings-afternoon">
            <input
              id="settings-afternoon"
              type="time"
              className={inputCls}
              value={settings.schedule_afternoon || "12:00"}
              onChange={(e) =>
                updateField("schedule_afternoon", e.target.value)
              }
            />
          </Field>
          <Field label="Evening" htmlFor="settings-evening">
            <input
              id="settings-evening"
              type="time"
              className={inputCls}
              value={settings.schedule_evening || "20:00"}
              onChange={(e) => updateField("schedule_evening", e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Timezone"
          htmlFor="settings-timezone"
          hint="Uses standard IANA timezone names, e.g. America/Edmonton"
        >
          <input
            id="settings-timezone"
            className={inputCls}
            value={settings.timezone || ""}
            onChange={(e) => updateField("timezone", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Preferences">
        <Field label="Remote preference" htmlFor="settings-remote-pref">
          <select
            id="settings-remote-pref"
            className={inputCls}
            value={settings.remote_preference || "any"}
            onChange={(e) => updateField("remote_preference", e.target.value)}
          >
            <option value="any">Any</option>
            <option value="remote">Remote only</option>
            <option value="hybrid">Hybrid only</option>
            <option value="onsite">On-site only</option>
          </select>
        </Field>
        <Field label="Minimum salary (optional)" htmlFor="settings-min-salary">
          <input
            id="settings-min-salary"
            type="number"
            className={inputCls}
            value={settings.min_salary || ""}
            onChange={(e) =>
              updateField(
                "min_salary",
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
        </Field>
      </Section>

      <button
        onClick={handleSave}
        disabled={saving}
        aria-label="Save all settings"
        className="px-5 py-2 bg-blue text-white text-sm font-semibold rounded-lg hover:bg-blue/90 active:bg-blue/80 active:scale-[0.98] disabled:opacity-50 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-base"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
      </button>
    </main>
  );
}
