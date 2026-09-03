"""
Minimal password protection for public deployment.

This is intentionally simple: one shared username/password, checked via
HTTP Basic Auth on every request. It is NOT a full auth system (no
per-user accounts, no sessions) — that's a deliberate scope decision for a
single-person personal tool being exposed on the public internet, not a
multi-user product.

If APP_USERNAME / APP_PASSWORD are not set in the environment, auth is
disabled entirely (this is the local-development default — see
config.py). Always set both before deploying anywhere public.
"""
import base64
import secrets

from starlette.requests import Request
from starlette.responses import Response

from app.config import settings


async def auth_middleware(request: Request, call_next):
    """Applied globally so the frontend's static files are protected too,
    not just the API. Health check is exempt so hosting platforms can
    still verify the service is up without credentials."""
    if not settings.app_username or not settings.app_password:
        # Auth not configured — local development mode, allow through.
        return await call_next(request)

    if request.url.path == "/api/health":
        return await call_next(request)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Basic "):
        return Response(status_code=401, headers={"WWW-Authenticate": "Basic"})

    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, _, password = decoded.partition(":")
    except Exception:
        return Response(status_code=401, headers={"WWW-Authenticate": "Basic"})

    correct_username = secrets.compare_digest(username, settings.app_username)
    correct_password = secrets.compare_digest(password, settings.app_password)
    if not (correct_username and correct_password):
        return Response(status_code=401, headers={"WWW-Authenticate": "Basic"})

    return await call_next(request)