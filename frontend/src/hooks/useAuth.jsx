import { createContext, useCallback, useContext, useMemo, useState } from "react";

/*
 * SECURITY NOTE — read before changing this file.
 *
 * The backend uses HTTP Basic Auth (see backend/app/auth.py), but without
 * the browser's native login popup — the frontend shows its own login
 * screen instead, then has to do the browser's job: hold the credential
 * and attach it to every API request.
 *
 * We store the base64-encoded "username:password" string in
 * sessionStorage, not localStorage:
 *   - sessionStorage clears when the tab/browser closes — a smaller
 *     exposure window than localStorage, which persists indefinitely.
 *   - Neither one is safe from an XSS attack (any injected script can read
 *     either). That's an inherent limitation of doing Basic Auth from JS
 *     at all — there's no way to make this fully equivalent to an
 *     httpOnly cookie or a proper server-side session from a plain SPA.
 *   - Base64 is ENCODING, not encryption — the credential is fully
 *     recoverable by anyone who reads it off the wire or out of storage.
 *     This entire scheme is only acceptable over HTTPS. Never deploy this
 *     app on plain HTTP once APP_USERNAME/APP_PASSWORD are set.
 *
 * If you need stronger guarantees (session expiry, revocation without
 * changing the shared password, per-user accounts), this isn't that —
 * see the note at the top of backend/app/auth.py for what a real
 * token/session-based system would require instead.
 */

const STORAGE_KEY = "job-hunter-auth";

const AuthContext = createContext(null);

function readStoredCredential() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    // sessionStorage can throw in some locked-down browser contexts
    // (private browsing in older Safari, etc.) — fail closed to "logged out".
    return null;
  }
}

export function AuthProvider({ children }) {
  const [credential, setCredential] = useState(() => readStoredCredential());

  const login = useCallback((username, password) => {
    const encoded = btoa(`${username}:${password}`);
    try {
      sessionStorage.setItem(STORAGE_KEY, encoded);
    } catch {
      // Storage unavailable — credential still works for this render via
      // state, but won't survive a refresh. Not fatal, just degraded.
    }
    setCredential(encoded);
  }, []);

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setCredential(null);
  }, []);

  const authHeader = useMemo(
    () => (credential ? { Authorization: `Basic ${credential}` } : {}),
    [credential]
  );

  const value = useMemo(
    () => ({
      isAuthenticated: credential !== null,
      login,
      logout,
      authHeader,
    }),
    [credential, login, logout, authHeader]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// Non-hook accessor so the plain (non-component) API client module can
// read/clear the credential without needing to be a React component.
export function getStoredAuthHeader() {
  const credential = readStoredCredential();
  return credential ? { Authorization: `Basic ${credential}` } : {};
}

export function clearStoredCredential() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}