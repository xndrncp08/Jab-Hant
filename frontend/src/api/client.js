const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });
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
