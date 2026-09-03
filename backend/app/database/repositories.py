"""
Thin data-access helpers. Kept as plain functions (not a repository class
hierarchy) since this is a small personal app — no need for the extra
ceremony.
"""
import json
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import AppSetting, Job, JobStatus, Resume, Search


# ---------------------------------------------------------------------------
# Resume
# ---------------------------------------------------------------------------

def create_resume(db: Session, *, filename: str, file_path: str, raw_text: str,
                   sections: dict, skills: list[str], search_keywords: list[str]) -> Resume:
    # Deactivate previous resumes (we keep history, but only one is "active")
    db.query(Resume).update({Resume.is_active: False})
    resume = Resume(
        filename=filename,
        file_path=file_path,
        raw_text=raw_text,
        sections_json=json.dumps(sections),
        skills_json=json.dumps(skills),
        search_keywords_json=json.dumps(search_keywords),
        is_active=True,
    )
    db.add(resume)
    db.commit()
    db.refresh(resume)
    return resume


def get_active_resume(db: Session) -> Optional[Resume]:
    return db.query(Resume).filter(Resume.is_active.is_(True)).order_by(Resume.created_at.desc()).first()


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

def find_potential_duplicates(db: Session, *, source: str, source_job_id: Optional[str],
                               company: Optional[str], normalized_title: Optional[str],
                               apply_url: Optional[str]) -> list[Job]:
    """Cheap pre-filter for the deduplication service (exact-ish signals).
    The embedding-similarity check happens on this candidate set in
    services/deduplication.py, not here."""
    q = db.query(Job)
    filters = []
    if source and source_job_id:
        filters.append((Job.source == source) & (Job.source_job_id == source_job_id))
    if apply_url:
        filters.append(Job.apply_url == apply_url)
    if company and normalized_title:
        filters.append((Job.company == company) & (Job.normalized_title == normalized_title))

    if not filters:
        return []

    combined = filters[0]
    for f in filters[1:]:
        combined = combined | f
    return db.query(Job).filter(combined).all()


def create_job(db: Session, **kwargs) -> Job:
    job = Job(**kwargs)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def list_jobs(db: Session, *, status: Optional[str] = None, min_match: Optional[float] = None,
              company: Optional[str] = None, location: Optional[str] = None,
              remote_type: Optional[str] = None, source: Optional[str] = None,
              search_text: Optional[str] = None, limit: int = 200, offset: int = 0):
    q = db.query(Job)
    if status:
        q = q.filter(Job.status == status)
    if min_match is not None:
        q = q.filter(Job.match_score >= min_match)
    if company:
        q = q.filter(Job.company.ilike(f"%{company}%"))
    if location:
        q = q.filter(Job.location.ilike(f"%{location}%"))
    if remote_type:
        q = q.filter(Job.remote_type == remote_type)
    if source:
        q = q.filter(Job.source == source)
    if search_text:
        like = f"%{search_text}%"
        q = q.filter((Job.title.ilike(like)) | (Job.company.ilike(like)))
    q = q.order_by(Job.match_score.desc().nullslast(), Job.date_discovered.desc())
    return q.offset(offset).limit(limit).all()


def get_job(db: Session, job_id: str) -> Optional[Job]:
    return db.query(Job).filter(Job.id == job_id).first()


def update_job(db: Session, job_id: str, **fields) -> Optional[Job]:
    job = get_job(db, job_id)
    if not job:
        return None
    for k, v in fields.items():
        setattr(job, k, v)
    if fields.get("status") == JobStatus.APPLIED.value and not job.application_date:
        job.application_date = datetime.now(timezone.utc)
    job.is_new = False if "status" in fields else job.is_new
    db.commit()
    db.refresh(job)
    return job


def job_counts_by_status(db: Session) -> dict:
    rows = db.query(Job.status, func.count(Job.id)).group_by(Job.status).all()
    return {status.value if hasattr(status, "value") else status: count for status, count in rows}


# ---------------------------------------------------------------------------
# Searches
# ---------------------------------------------------------------------------

def create_search(db: Session, *, trigger: str) -> Search:
    search = Search(trigger=trigger, status="running")
    db.add(search)
    db.commit()
    db.refresh(search)
    return search


def complete_search(db: Session, search_id: str, *, jobs_scanned: int, new_jobs: int,
                     duplicate_jobs: int, errors: list, sources: dict, status: str = "completed") -> Search:
    search = db.query(Search).filter(Search.id == search_id).first()
    search.completed_at = datetime.now(timezone.utc)
    search.jobs_scanned = jobs_scanned
    search.new_jobs = new_jobs
    search.duplicate_jobs = duplicate_jobs
    search.errors_json = json.dumps(errors)
    search.sources_json = json.dumps(sources)
    search.status = status
    db.commit()
    db.refresh(search)
    return search


def list_searches(db: Session, limit: int = 50):
    return db.query(Search).order_by(Search.started_at.desc()).limit(limit).all()


def get_search(db: Session, search_id: str) -> Optional[Search]:
    return db.query(Search).filter(Search.id == search_id).first()


# ---------------------------------------------------------------------------
# Settings (key/value)
# ---------------------------------------------------------------------------

DEFAULT_SETTINGS_KEYS = {
    "search_location", "search_country", "search_distance", "search_results_per_site",
    "search_terms", "job_boards", "min_match_score",
    "schedule_morning", "schedule_afternoon", "schedule_evening", "timezone",
    "remote_preference", "min_salary", "employment_type_preference",
    "match_weight_semantic", "match_weight_skills", "match_weight_experience",
    "match_weight_location",
}


def get_setting(db: Session, key: str, default=None):
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    if row is None:
        return default
    try:
        return json.loads(row.value)
    except (TypeError, ValueError):
        return row.value


def set_setting(db: Session, key: str, value) -> None:
    row = db.query(AppSetting).filter(AppSetting.key == key).first()
    serialized = json.dumps(value)
    if row:
        row.value = serialized
    else:
        row = AppSetting(key=key, value=serialized)
        db.add(row)
    db.commit()


def get_all_settings(db: Session) -> dict:
    rows = db.query(AppSetting).all()
    out = {}
    for row in rows:
        try:
            out[row.key] = json.loads(row.value)
        except (TypeError, ValueError):
            out[row.key] = row.value
    return out
