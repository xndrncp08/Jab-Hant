import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/*
 * HONESTY NOTE: as shipped, this app sets no cookies and loads no
 * third-party scripts or analytics — everything runs locally, and the only
 * "storage" in play is sessionStorage for your login credential (see
 * useAuth.jsx) and, if you use them, your own browser's local settings.
 * This banner exists as the *infrastructure* for consent-gating optional
 * scripts (analytics, embeds, etc.) if you add any later — see
 * `hasConsent()` below, which any future script-loading code should check
 * before injecting anything. Until you add such a script, both buttons
 * below have the same practical effect; the banner still records and
 * respects the user's choice either way, which is the point of asking.
 */

const STORAGE_KEY = "job-hunter-cookie-consent";

export function getStoredConsent() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Call this before loading any optional/third-party/analytics script.
// Returns false until the user has explicitly accepted "all".
export function hasOptionalConsent() {
  const consent = getStoredConsent();
  return consent?.level === "all";
}

function storeConsent(level) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ level, decidedAt: new Date().toISOString() }),
    );
  } catch {
    /* localStorage unavailable — consent choice won't persist across
       reloads, but the banner will simply ask again next time, which is
       the safe failure mode (never silently assumes consent). */
  }
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => getStoredConsent() === null);
  const dialogRef = useRef(null);
  const firstFocusableRef = useRef(null);

  useEffect(() => {
    if (!visible) return;

    // Move focus into the dialog when it appears — required for a
    // keyboard/screen-reader user to know it exists at all.
    firstFocusableRef.current?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        // ESC = the safe, minimal choice, not "dismiss and assume everything".
        acceptNecessaryOnly();
        return;
      }
      if (e.key !== "Tab") return;

      // Basic focus trap: keep Tab/Shift+Tab cycling within the dialog.
      const focusable = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function acceptAll() {
    storeConsent("all");
    setVisible(false);
  }

  function acceptNecessaryOnly() {
    storeConsent("necessary");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-description"
      ref={dialogRef}
      className="fixed inset-x-0 bottom-0 z-50 p-4 flex justify-center"
    >
      <div className="w-full max-w-2xl bg-card/90 backdrop-blur-xl border border-accent/70 rounded-xl shadow-raised p-5">
        <h2
          id="cookie-consent-title"
          className="font-display font-semibold text-ink mb-2"
        >
          Cookie &amp; storage preferences
        </h2>
        <p
          id="cookie-consent-description"
          className="text-sm text-highlight/75 mb-4"
        >
          This app stores your login session in your browser and, going forward,
          may offer optional features (like usage analytics) that use additional
          local storage or third-party scripts. Those optional features stay off
          until you choose "Accept all." Read the full{" "}
          <Link
            to="/cookies"
            className="underline text-blue hover:text-blue/80 focus-visible:ring-2 focus-visible:ring-blue rounded"
          >
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            ref={firstFocusableRef}
            type="button"
            onClick={acceptNecessaryOnly}
            aria-label="Accept necessary storage only, decline optional features"
            className="px-4 py-2 text-sm font-medium border border-accent text-ink rounded-lg hover:bg-accent/40 active:bg-accent/60 active:scale-[0.98] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue"
          >
            Accept necessary only
          </button>
          <button
            type="button"
            onClick={acceptAll}
            aria-label="Accept all storage, including optional features"
            className="px-4 py-2 text-sm font-medium bg-blue text-white rounded-lg hover:bg-blue/90 active:bg-blue/80 active:scale-[0.98] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-blue focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
