import { getStoredAuthHeader, clearStoredCredential } from "../hooks/useAuth.jsx";

// In local dev, point at the separately-running backend (localhost:8000 by
// default, or override with VITE_API_URL). In production, the frontend is
// served by the same FastAPI app as the API, so an empty base means
// same-origin requests — no separate URL needed, and no CORS involved.
const BASE_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8000" : "");

// Fired whenever a request comes back 401, so the app shell can react
// (show the login screen again) without every call site needing to know
// about auth. See App.jsx, which listens for this.
export const AUTH_EXPIRED_EVENT = "job-hunter:auth-expired";

async function request(path, options = {}) {
  const authHeader = getStoredAuthHeader();
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...authHeader,
      ...options.headers,
    },
  });

  if (res.status === 401) {
    clearStoredCredential();
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Used by the login form itself — deliberately bypasses the shared
// `request()` helper's 401-handling (a failed login attempt is expected
// and shouldn't clear/redirect anything, just report failure back to the
// form).
export async function verifyCredentials(username, password) {
  const encoded = btoa(`${username}:${password}`);
  const res = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Authorization: `Basic ${encoded}` },
  });
  return res.ok;
}

export const api = {
  // Jobs
  listJobs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null)
    ).toString();
    return request(`/api/jobs${qs ? `?${qs}` : ""}`);
  },
  jobCounts: () => request("/api/jobs/counts"),
  getJob: (id) => request(`/api/jobs/${id}`),
  updateJob: (id, fields) =>
    request(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),

  // Search
  runSearch: () => request("/api/search", { method: "POST" }),
  searchHistory: () => request("/api/search/history"),
  getSearch: (id) => request(`/api/search/${id}`),

  // Resume
  uploadResume: (file) => {
    const form = new FormData();
    form.append("file", file);
    return request("/api/resume/upload", { method: "POST", body: form });
  },
  getResume: () => request("/api/resume"),
  generateImprovementPrompt: () => request("/api/resume/improvement-prompt", { method: "POST" }),

  // Applications
  listApplications: () => request("/api/applications"),

  // Analytics
  keywordAnalytics: () => request("/api/analytics/keywords"),
  matchAnalytics: () => request("/api/analytics/matches"),

  // Settings
  getSettings: () => request("/api/settings"),
  updateSettings: (values) =>
    request("/api/settings", { method: "PUT", body: JSON.stringify({ values }) }),
};