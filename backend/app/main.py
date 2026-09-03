import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analytics, applications, jobs, resume, searches, settings as settings_api
from app.config import settings
from app.database.database import init_db
from app.scheduler.jobs import shutdown_scheduler, start_scheduler

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(name)s: %(message)s",
                     datefmt="%H:%M:%S")
logger = logging.getLogger("job_hunter.main")

app = FastAPI(title="Job Hunter", version="0.1.0")

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
