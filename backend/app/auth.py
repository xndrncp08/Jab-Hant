"""
Password protection for public deployment — SPA-friendly version.

WHY THIS LOOKS DIFFERENT FROM A "TYPICAL" HTTP BASIC AUTH SETUP:

Textbook HTTP Basic Auth sends a `WWW-Authenticate: Basic` header on 401,
which makes the *browser itself* pop up a native username/password dialog
before any of your page's JavaScript or HTML ever loads. That's simple, but
it means you can't show a custom login screen — the browser's prompt wins
the race every time.

To get a custom login page instead, we split what gets protected:

  1. The frontend's static files (index.html, JS, CSS) are served WITHOUT
     auth, so the React app can always load and show a login screen.
  2. Every /api/* route (except the health check) DOES require valid
     credentials, checked from an `Authorization: Basic <base64>` header —
     same HTTP Basic mechanics as before, just without the header that
     triggers the browser's native popup.
  3. The frontend is responsible for: collecting credentials on its own
     login form, base64-encoding them, attaching that header to every API
     call, and reacting to a 401 by showing the login screen again.

SECURITY NOTES (read this before deploying):

  - This is still fundamentally a single shared password, not real
    multi-user auth. Every API request re-sends the same credential —
    there's no server-side session, no token expiry, no per-user anything.
  - Because there's no WWW-Authenticate challenge, the browser will NOT
    cache/autofill these credentials the way it does for native Basic
    Auth. The frontend takes on that responsibility (see AuthContext.jsx),
    which also means the frontend now holds the plaintext-adjacent
    (base64 is NOT encryption) credential in memory/sessionStorage for the
    session — see the security note in AuthContext.jsx for why sessionStorage
    was chosen over localStorage, and why this whole scheme requires HTTPS
    in production (Basic Auth credentials are trivially readable by anyone
    who can see the traffic otherwise).
  - If you need real multi-user accounts, per-user audit trails, or
    revocable sessions, this is not that — it would need a proper
    users table, hashed+salted passwords, and token-based sessions
    (e.g. JWT or server-side sessions). Flagging that explicitly since it's
    a meaningfully different security posture than what's built here.
"""
import base64
import secrets

from starlette.requests import Request
from starlette.responses import JSONResponse

from app.config import settings

# Paths that are never gated, regardless of auth configuration.
PUBLIC_PATHS = {"/api/health"}


def _is_api_path(path: str) -> bool:
    return path.startswith("/api/")


def _check_credentials(auth_header: str | None) -> bool:
    if not auth_header or not auth_header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, _, password = decoded.partition(":")
    except Exception:
        return False

    correct_username = secrets.compare_digest(username, settings.app_username)
    correct_password = secrets.compare_digest(password, settings.app_password)
    return correct_username and correct_password


async def auth_middleware(request: Request, call_next):
    """
    - If APP_USERNAME/APP_PASSWORD aren't configured: auth is fully
      disabled (local development default).
    - Non-API paths (the SPA shell, its JS/CSS) are always allowed through,
      so the login screen itself can load.
    - /api/health is always allowed through, so hosting platforms can
      health-check without credentials.
    - Every other /api/* path requires a valid Authorization: Basic header.
    """
    if not settings.app_username or not settings.app_password:
        return await call_next(request)

    path = request.url.path

    if not _is_api_path(path) or path in PUBLIC_PATHS:
        return await call_next(request)

    if not _check_credentials(request.headers.get("Authorization")):
        # Deliberately no WWW-Authenticate header — we don't want the
        # browser's native login popup; the frontend handles this 401
        # by showing its own login screen instead.
        return JSONResponse(status_code=401, content={"detail": "Invalid or missing credentials"})

    return await call_next(request)