import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { verifyCredentials } from "../api/client.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) {
      setError("Enter both a username and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ok = await verifyCredentials(username, password);
      if (ok) {
        login(username, password);
        navigate(redirectTo, { replace: true });
      } else {
        setError("Incorrect username or password.");
      }
    } catch {
      setError("Couldn't reach the server. Check that the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue/10 via-base to-base flex items-center justify-center px-4">
      <main className="w-full max-w-[380px]">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div
            className="w-2.5 h-2.5 rounded-full bg-blue"
            aria-hidden="true"
          />
          <span className="font-display font-semibold text-lg tracking-tight text-ink">
            Job Hunter
          </span>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-accent/70 rounded-xl shadow-raised p-7">
          <h1 className="font-display text-[22px] tracking-tight font-semibold text-ink mb-1">
            Sign in
          </h1>
          <p className="text-sm text-highlight/75 mb-6">
            This app is password-protected. Enter the credentials configured on
            the server.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-describedby={error ? "login-error" : undefined}
          >
            <div className="mb-4">
              <label
                htmlFor="login-username"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Username
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                aria-required="true"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-base border border-accent rounded-lg text-ink placeholder:text-highlight/55 outline-none focus-visible:ring-2 focus-visible:ring-blue transition-shadow"
                placeholder="your username"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="login-password"
                className="block text-sm font-medium text-ink mb-1.5"
              >
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                aria-required="true"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-base border border-accent rounded-lg text-ink placeholder:text-highlight/55 outline-none focus-visible:ring-2 focus-visible:ring-blue transition-shadow"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                id="login-error"
                role="alert"
                className="text-sm text-red bg-red/10 border border-red/20 rounded-lg px-3 py-2 mb-4"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="w-full px-4 py-2.5 bg-blue text-white font-semibold text-sm rounded-lg hover:bg-blue/90 active:bg-blue/80 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {submitting ? "Checking…" : "Submit credentials"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-highlight/55 mt-6">
          Runs locally by default · your data stays on this machine unless you
          deploy it publicly
        </p>
      </main>
    </div>
  );
}
