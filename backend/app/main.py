import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.api import analytics, applications, jobs, resume, searches, settings as settings_api
from app.auth import auth_middleware
from app.config import settings
from app.database.database import init_db
from app.scheduler.jobs import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
                     datefmt="%H:%M:%S")
logger = logging.getLogger("job_hunter.main")

app = FastAPI(title="Job Hunter", version="0.1.0")

# Auth runs first (outermost). See app/auth.py for the full explanation of
# what is and isn't gated: in short, the frontend's static files (and the
# custom /login screen they contain) are always reachable so the login UI
# itself can load, while every /api/* route (except /api/health) requires
# valid Authorization: Basic credentials once APP_USERNAME/APP_PASSWORD
# are set. This is different from a "gate everything" model on purpose —
# see auth.py's module docstring for why.
app.middleware("http")(auth_middleware)

# CORS only matters for local dev (frontend on :5173 hitting backend on
# :8000). In production the frontend is served from this same app/origin,
# so these origins are simply unused there.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)
app.include_router(searches.router)
app.include_router(resume.router)
app.include_router(applications.router)
app.include_router(analytics.router)
app.include_router(settings_api.router)


@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("Database initialized")
    try:
        start_scheduler()
    except Exception:
        logger.exception("Failed to start scheduler (searches will still work via 'Run Search Now')")


@app.on_event("shutdown")
def on_shutdown():
    shutdown_scheduler()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# --- Serve the built React frontend (production/deployment only) ---
# In local dev, run the Vite dev server separately (npm run dev) instead —
# this block only activates if frontend/dist exists, i.e. after `npm run
# build`, so it's a no-op for local development unless you've built it.
_frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if _frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(_frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Let any real static file (favicon, etc.) resolve directly; anything
        # else falls back to index.html so React Router can handle the route
        # client-side (this is a single-page app) — including showing the
        # /login screen itself when not yet authenticated.
        candidate = _frontend_dist / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_frontend_dist / "index.html")
else:
    logger.info("frontend/dist not found — run `npm run build` in frontend/ before deploying, "
                "or use `npm run dev` for local development")