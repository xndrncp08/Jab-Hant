import { useEffect, useState, useRef } from "react";
import { api } from "../api/client.js";

function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-faint mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-surface border border-line rounded p-5 mb-6">
      <h2 className="font-display font-semibold text-sm mb-4">{title}</h2>
      {children}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm border border-line rounded outline-none focus:border-signal bg-white";

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
    Promise.all([
      api.getResume().catch(() => null),
      api.getSettings(),
    ]).then(([resumeRes, settingsRes]) => {
      setResume(resumeRes);
      setSettings(settingsRes);
      const existingTerms = settingsRes.search_terms || [];
      if (existingTerms.length > 0) {
        setTermsText(existingTerms.join("\n"));
      } else if (resumeRes?.search_keywords?.length) {
        setTermsText(resumeRes.search_keywords.join("\n"));
      }
    });
  }, []);

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.uploadResume(file);
      setResume(res);
      // Seed search terms from the newly parsed resume if none set yet
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
        search_terms: termsText.split("\n").map((t) => t.trim()).filter(Boolean),
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

  if (!settings) return <div className="text-muted text-sm">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-6">Settings</h1>

      {error && (
        <div className="mb-5 px-4 py-3 bg-bad-dim text-bad text-sm rounded border border-bad/20">
          {error}
        </div>
      )}

      <Section title="Resume">
        {resume ? (
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium">{resume.filename}</p>
              <p className="text-xs text-muted mt-0.5">
                {resume.skills?.length || 0} skills detected · {resume.search_keywords?.length || 0}{" "}
                search terms suggested
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted mb-3">No resume uploaded yet.</p>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={uploading}
          className="px-4 py-2 border border-line rounded text-sm font-medium hover:bg-paper transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading…" : resume ? "Upload new resume" : "Upload resume (PDF)"}
        </button>
      </Section>

      <Section title="Search">
        <Field label="Location">
          <input
            className={inputCls}
            value={settings.search_location || ""}
            onChange={(e) => updateField("search_location", e.target.value)}
          />
        </Field>
        <Field label="Country">
          <input
            className={inputCls}
            value={settings.search_country || ""}
            onChange={(e) => updateField("search_country", e.target.value)}
          />
        </Field>
        <Field label="Search distance (miles)">
          <input
            type="number"
            className={inputCls}
            value={settings.search_distance || 0}
            onChange={(e) => updateField("search_distance", Number(e.target.value))}
          />
        </Field>
        <Field
          label="Search terms"
          hint="One per line. Seeded from your resume — edit freely."
        >
          <textarea
            rows={6}
            className={`${inputCls} font-mono resize-none`}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
          />
        </Field>
        <Field label="Minimum match score to save a job">
          <input
            type="number"
            min={0}
            max={100}
            className={inputCls}
            value={settings.min_match_score || 0}
            onChange={(e) => updateField("min_match_score", Number(e.target.value))}
          />
        </Field>
      </Section>

      <Section title="Schedule">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Morning">
            <input
              type="time"
              className={inputCls}
              value={settings.schedule_morning || "08:00"}
              onChange={(e) => updateField("schedule_morning", e.target.value)}
            />
          </Field>
          <Field label="Afternoon">
            <input
              type="time"
              className={inputCls}
              value={settings.schedule_afternoon || "12:00"}
              onChange={(e) => updateField("schedule_afternoon", e.target.value)}
            />
          </Field>
          <Field label="Evening">
            <input
              type="time"
              className={inputCls}
              value={settings.schedule_evening || "20:00"}
              onChange={(e) => updateField("schedule_evening", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Timezone" hint="Uses standard IANA timezone names, e.g. America/Edmonton">
          <input
            className={inputCls}
            value={settings.timezone || ""}
            onChange={(e) => updateField("timezone", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Preferences">
        <Field label="Remote preference">
          <select
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
        <Field label="Minimum salary (optional)">
          <input
            type="number"
            className={inputCls}
            value={settings.min_salary || ""}
            onChange={(e) => updateField("min_salary", e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </Section>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-5 py-2 bg-signal text-white text-sm font-medium rounded hover:bg-signal/90 disabled:opacity-50 transition-colors"
      >
        {saving ? "Saving…" : saved ? "Saved" : "Save settings"}
      </button>
    </div>
  );
}
