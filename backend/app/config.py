"""
Central configuration for the Job Hunter backend.

All values can be overridden via a `.env` file in the `backend/` directory
(copy `.env.example` to `.env` to get started). Search-related defaults are
also mirrored into the `settings` DB table on first run so they can be
edited from the frontend without touching the .env file.
"""
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), extra="ignore")

    # Database
    database_url: str = f"sqlite:///{(BACKEND_DIR.parent / 'data' / 'jobs.db').as_posix()}"

    # Vector DB
    chroma_path: str = str((BACKEND_DIR.parent / "data" / "chroma").resolve())

    # Timezone used by the scheduler
    timezone: str = "America/Edmonton"

    # Default search parameters (seeded into DB settings table on first run)
    search_location: str = "Calgary, Alberta, Canada"
    search_country: str = "Canada"
    search_results_per_site: int = 50
    search_distance: int = 50

    # Schedule (24h HH:MM, local timezone)
    search_time_morning: str = "08:00"
    search_time_afternoon: str = "12:00"
    search_time_evening: str = "20:00"

    # Optional external AI API — never required for core functionality
    anthropic_api_key: str = ""

    # Resume storage
    resume_storage_dir: str = str((BACKEND_DIR.parent / "data" / "resume").resolve())

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # Embedding model (local, via sentence-transformers — no external API calls)
    embedding_model: str = "all-MiniLM-L6-v2"

    # Job boards JobSpy should query. Trim this list if a board is unreliable
    # in your region — errors on one board never stop the others (see
    # services/job_search.py).
    job_boards: list[str] = ["indeed", "linkedin", "glassdoor", "zip_recruiter", "google"]


settings = Settings()

# Ensure data directories exist
Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
Path(settings.resume_storage_dir).mkdir(parents=True, exist_ok=True)
Path(settings.database_url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)
