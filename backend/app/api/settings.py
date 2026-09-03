from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config import settings as app_settings
from app.database import repositories
from app.database.database import get_db
from app.schemas import SettingsUpdate
from app.scheduler import jobs as scheduler_jobs

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULTS = {
    "search_location": app_settings.search_location,
    "search_country": app_settings.search_country,
    "search_distance": app_settings.search_distance,
    "search_results_per_site": app_settings.search_results_per_site,
    "search_terms": [],
    "job_boards": app_settings.job_boards,
    "min_match_score": 0,
    "schedule_morning": app_settings.search_time_morning,
    "schedule_afternoon": app_settings.search_time_afternoon,
    "schedule_evening": app_settings.search_time_evening,
    "timezone": app_settings.timezone,
    "remote_preference": "any",
    "min_salary": None,
    "employment_type_preference": [],
}


@router.get("")
def get_settings(db: Session = Depends(get_db)):
    stored = repositories.get_all_settings(db)
    return {**DEFAULTS, **stored}


@router.put("")
def update_settings(payload: SettingsUpdate, db: Session = Depends(get_db)):
    for key, value in payload.values.items():
        repositories.set_setting(db, key, value)

    schedule_keys = {"schedule_morning", "schedule_afternoon", "schedule_evening", "timezone"}
    if schedule_keys & payload.values.keys():
        current = get_settings(db)
        try:
            scheduler_jobs.reschedule(
                current["schedule_morning"], current["schedule_afternoon"],
                current["schedule_evening"], current["timezone"],
            )
        except Exception:
            pass  # scheduler may not be running yet (e.g. during tests)

    return get_settings(db)
