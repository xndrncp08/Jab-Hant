"""
Runs the search pipeline automatically at 8 AM / 12 PM / 8 PM local time
(build plan section 6). Times + timezone are configurable via .env
(SEARCH_TIME_MORNING/AFTERNOON/EVENING, TIMEZONE) and can be overridden from
the Settings page (stored in the `settings` table, checked first).
"""
import logging
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.config import settings
from app.database import repositories
from app.database.database import SessionLocal
from app.services.pipeline import run_search

logger = logging.getLogger("job_hunter.scheduler")

scheduler = BackgroundScheduler(timezone=settings.timezone)


def scheduled_search_job() -> None:
    db = SessionLocal()
    try:
        logger.info("Running scheduled job search")
        run_search(db, trigger="scheduled")
    except Exception:
        logger.exception("Scheduled search failed")
    finally:
        db.close()


def _parse_hhmm(value: str) -> tuple[int, int]:
    hour, minute = value.split(":")
    return int(hour), int(minute)


def _current_schedule() -> dict:
    db = SessionLocal()
    try:
        return {
            "morning": repositories.get_setting(db, "schedule_morning") or settings.search_time_morning,
            "afternoon": repositories.get_setting(db, "schedule_afternoon") or settings.search_time_afternoon,
            "evening": repositories.get_setting(db, "schedule_evening") or settings.search_time_evening,
            "timezone": repositories.get_setting(db, "timezone") or settings.timezone,
        }
    finally:
        db.close()


def start_scheduler() -> None:
    schedule = _current_schedule()
    scheduler.timezone = ZoneInfo(schedule["timezone"])

    for job_id, time_str in [
        ("morning_search", schedule["morning"]),
        ("afternoon_search", schedule["afternoon"]),
        ("evening_search", schedule["evening"]),
    ]:
        hour, minute = _parse_hhmm(time_str)
        scheduler.add_job(
            scheduled_search_job,
            CronTrigger(hour=hour, minute=minute, timezone=schedule["timezone"]),
            id=job_id,
            replace_existing=True,
        )
        logger.info("Scheduled %s at %02d:%02d %s", job_id, hour, minute, schedule["timezone"])

    scheduler.start()


def reschedule(morning: str, afternoon: str, evening: str, timezone: str) -> None:
    """Called from the Settings API when the user changes search times."""
    for job_id, time_str in [
        ("morning_search", morning), ("afternoon_search", afternoon), ("evening_search", evening),
    ]:
        hour, minute = _parse_hhmm(time_str)
        scheduler.reschedule_job(job_id, trigger=CronTrigger(hour=hour, minute=minute, timezone=timezone))


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
