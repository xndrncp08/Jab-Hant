# Authentication, Dark Theme & Compliance Pages

This document covers what changed when the app moved from a browser-native
Basic Auth popup to a custom login screen, plus the dark theme, cookie
consent, and legal pages added alongside it. Read this before deploying
publicly — the security trade-offs section below matters.

## Why the login flow looks the way it does

Textbook HTTP Basic Auth makes the *browser* pop up its own native
username/password dialog before your page ever loads — simple, but you
can't skin it or control its UX. To get a real login screen instead:

1. **The frontend's static files (index.html, JS, CSS) are never
   auth-gated.** The React app can always load, so it can always show a
   login screen — even before any credentials exist.
2. **Every `/api/*` route (except `/api/health`) requires a valid
   `Authorization: Basic <base64>` header.** Same underlying mechanism as
   before, just without the `WWW-Authenticate` response header that
   triggers the browser's native popup.
3. **The frontend does the browser's old job**: it collects credentials
   on its own form (`src/pages/Login.jsx`), stores the base64-encoded
   credential, attaches it to every API call (`src/api/client.js`), and
   reacts to any `401` by clearing the stored credential and redirecting
   back to `/login` (see the `job-hunter:auth-expired` event in
   `src/App.jsx`).

## Security trade-offs — read before deploying

This is still fundamentally **one shared password**, not real multi-user
authentication:

- No server-side session, no token expiry, no per-user anything. Every
  request just re-sends the same credential.
- The credential is held in **sessionStorage** (not localStorage) —
  chosen specifically because it clears when the tab/browser closes,
  shrinking the exposure window. It is *not* immune to XSS: any injected
  script can still read it. That's an inherent limitation of doing Basic
  Auth from JavaScript at all; there's no way to make this as safe as an
  `httpOnly` cookie or a real server-side session from a plain SPA.
- Base64 is **encoding, not encryption** — trivially reversible by anyone
  who sees it on the wire or in storage. **This scheme requires HTTPS in
  production.** Never deploy with `APP_USERNAME`/`APP_PASSWORD` set over
  plain HTTP.
- If you need session expiry, revocation without rotating the shared
  password, or real per-user accounts, this isn't that. It would need a
  proper `users` table, hashed+salted passwords, and token-based sessions
  (JWT or server-side). That's a meaningfully different (and larger)
  piece of work than what's built here — ask if you want it built.

Full technical detail lives in the module docstrings of
`backend/app/auth.py` and `frontend/src/hooks/useAuth.jsx`.

## Color system

The UI follows a strict 4-color palette (no other hues are used anywhere
in the app):

| Token | Hex | Role |
|---|---|---|
| `base` / `paper` | `#010736` | Page background |
| `card` / `surface` | `#0D1C42` | Panels, cards |
| `accent` / `line` | `#22396F` | Borders, dividers, secondary UI |
| `highlight` / `ink` | `#FCF1D0` | Primary text, primary actions |

Text hierarchy is built from **opacity steps on `highlight`**, not new
hues, to stay inside the 4-color constraint:

| Class | Effective contrast vs. `card` | Use |
|---|---|---|
| `text-highlight` (100%) | ~14.8:1 | Primary text |
| `text-highlight/75` | ~7.7:1 | Secondary text |
| `text-highlight/55` | ~5.3:1 | Tertiary text (floor — don't go lower for body text) |

All values comfortably clear WCAG 2.1 AA's 4.5:1 minimum for normal text;
most exceed AAA's 7:1. `text-highlight/55` is the deliberate floor — going
lower starts to fail AA against the `card` background specifically.

**Job status badges use icons + text, not color hue** (`New`, `Applied`,
`Rejected`, etc. all render on the same accent/highlight backgrounds,
distinguished by an icon glyph and the label itself). This isn't a
limitation worked around — WCAG 1.4.1 ("Use of Color") specifically
recommends against color being the *only* way information is conveyed, so
this is the more accessible choice regardless of the palette constraint.

Every interactive element has an explicit `focus-visible:ring-2
focus-visible:ring-highlight` (or the global `:focus-visible` rule in
`index.css`) — visible only for keyboard/assistive-tech navigation, not
mouse clicks, per WCAG 2.4.7.

## Cookie consent

As shipped, **this app sets no cookies and loads no third-party scripts or
analytics** — everything runs locally. The consent banner
(`src/components/CookieConsent.jsx`) exists as infrastructure for
consent-gating *future* optional scripts, not because anything currently
needs gating:

- `getStoredConsent()` / `hasOptionalConsent()` are exported for any
  future script-loading code to check before injecting anything.
- Choice is stored in `localStorage` under `job-hunter-cookie-consent`.
- The banner is a fully keyboard-accessible modal: focus moves into it on
  mount, `Tab`/`Shift+Tab` are trapped within it, and `Escape` accepts
  "necessary only" (the safe default) rather than silently dismissing.

## Legal pages

`/privacy`, `/terms`, and `/cookies` (`src/pages/Privacy.jsx`,
`Terms.jsx`, `CookiePolicy.jsx`) contain **honest, specific-to-this-app**
content — not generic SaaS boilerplate — describing what data this app
actually stores, where it goes (job boards via JobSpy, nowhere else by
default), and who controls it (whoever deploys the instance). Each page
ends with a plain disclaimer that this is a factual description, not legal
advice, and to have a lawyer review it before relying on it beyond
personal use.

## Running the tests

**Frontend** (Vitest + React Testing Library), from `frontend/`:

```bash
npm test
```

Covers: login form submission and state handling (valid/invalid
credentials, network failure, loading state), the underlying auth context
(session storage read/write on login/logout), and the cookie consent
banner (accept-all vs. necessary-only, `Escape` behavior, Tab focus trap).

**Backend** (pytest), from `backend/` with the venv active:

```bash
python3 -m pytest tests/test_auth.py -v
```

Covers: auth disabled vs. configured, the frontend shell and static assets
always loading unauthenticated, `/api/health` always being open, missing/
wrong/correct credentials on `/api/*` routes, and — importantly — that the
`401` response never includes a `WWW-Authenticate` header (which would
trigger the browser's native popup instead of the custom login screen).