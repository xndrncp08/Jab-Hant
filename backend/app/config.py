from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(BACKEND_DIR / ".env"), extra="ignore")
    database_url: str = f"sqlite:///{(BACKEND_DIR.parent / 'data' / 'jobs.db').as_posix()}"
    chroma_path: str = str((BACKEND_DIR.parent / "data" / "chroma").resolve())
    timezone: str = "America/Edmonton"
    search_location: str = "Calgary, Alberta, Canada"
    search_country: str = "Canada"
    search_results_per_site: int = 50
    search_distance: int = 50
    search_time_morning: str = "08:00"
    search_time_afternoon: str = "12:00"
    search_time_evening: str = "20:00"
    anthropic_api_key: str = ""
    resume_storage_dir: str = str((BACKEND_DIR.parent / "data" / "resume").resolve())
    frontend_origin: str = "http://localhost:5173"
    app_username: str = ""
    app_password: str = ""
    embedding_model: str = "all-MiniLM-L6-v2"
    job_boards: list[str] = ["indeed", "linkedin", "glassdoor", "zip_recruiter", "google"]

settings = Settings()
Path(settings.chroma_path).mkdir(parents=True, exist_ok=True)
Path(settings.resume_storage_dir).mkdir(parents=True, exist_ok=True)
Path(settings.database_url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True)