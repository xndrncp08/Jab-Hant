"""
The end-to-end job search pipeline (build plan section 7):

    Scheduler / manual trigger
        -> generate search queries
        -> JobSpy
        -> normalize job data (job_search.py)
        -> deduplicate (deduplication.py)
        -> generate embedding (embeddings.py)
        -> compare against resume embeddings
        -> calculate relevance score (job_matching.py)
        -> save job
        -> frontend displays job

This module is what both the scheduler and the "Run Search Now" API
endpoint call, so both paths always execute identically.
"""
import json
import logging

from sqlalchemy.orm import Session

from app.config import settings
from app.database import repositories
from app.database.models import RemoteType
from app.services import deduplication, embeddings, job_matching, job_search

logger = logging.getLogger("job_hunter.pipeline")


def _remote_type(is_remote: bool | None, location: str | None) -> RemoteType:
    if is_remote:
        return RemoteType.REMOTE
    if location and "hybrid" in location.lower():
        return RemoteType.HYBRID
    if is_remote is False:
        return RemoteType.ON_SITE
    return RemoteType.UNKNOWN


def run_search(db: Session, *, trigger: str = "manual") -> dict:
    resume = repositories.get_active_resume(db)
    if resume is None:
        raise ValueError("No active resume found. Upload a resume before running a search.")

    sections = json.loads(resume.sections_json)
    resume_skills = json.loads(resume.skills_json)
    saved_keywords = repositories.get_setting(db, "search_terms")
    search_terms = saved_keywords or json.loads(resume.search_keywords_json)

    location = repositories.get_setting(db, "search_location", default=None) or settings.search_location
    country = repositories.get_setting(db, "search_country", default=None) or settings.search_country
    distance = repositories.get_setting(db, "search_distance", default=None) or settings.search_distance
    results_per_site = repositories.get_setting(
        db, "search_results_per_site", default=None) or settings.search_results_per_site
    boards = repositories.get_setting(db, "job_boards", default=None) or settings.job_boards
    weights = repositories.get_setting(db, "match_weights", default=None) or job_matching.DEFAULT_WEIGHTS
    min_match_score = repositories.get_setting(db, "min_match_score", default=0)

    search_record = repositories.create_search(db, trigger=trigger)
    logger.info("[%s] Starting %s job search", search_record.id, trigger)

    resume_embedding = embeddings.get_resume_overall_embedding(sections)

    try:
        raw_jobs, source_status, errors = job_search.search_jobs(
            search_terms, location=location, country=country, distance=distance,
            results_per_site=results_per_site, boards=boards,
        )
    except Exception as exc:
        logger.exception("Pipeline failed before any jobs were processed")
        repositories.complete_search(
            db, search_record.id, jobs_scanned=0, new_jobs=0, duplicate_jobs=0,
            errors=[{"source": "pipeline", "error": str(exc)}], sources={}, status="failed",
        )
        raise

    logger.info("[%s] %d jobs discovered before dedup", search_record.id, len(raw_jobs))

    new_count = 0
    dup_count = 0

    for raw in raw_jobs:
        normalized_title = deduplication.normalize_title(raw["title"])
        raw["normalized_title"] = normalized_title

        existing = deduplication.is_duplicate(db, raw, None)
        if existing is not None:
            dup_count += 1
            continue

        job_embedding = embeddings.embed_text(f"{raw['title']}\n\n{raw.get('description') or ''}")

        match = job_matching.compute_match(
            resume_embedding=resume_embedding,
            job_embedding=job_embedding,
            resume_skills=resume_skills,
            job_description=raw.get("description") or "",
            job_location=raw.get("location"),
            is_remote=raw.get("is_remote"),
            preferred_location=location,
            weights=weights,
        )

        if min_match_score and match["match_score"] < float(min_match_score):
            continue

        job = repositories.create_job(
            db,
            title=raw["title"],
            company=raw.get("company"),
            location=raw.get("location"),
            description=raw.get("description"),
            job_url=raw.get("job_url"),
            apply_url=raw.get("apply_url"),
            source=raw.get("source"),
            source_job_id=raw.get("source_job_id"),
            date_posted=raw.get("date_posted"),
            salary_min=raw.get("salary_min"),
            salary_max=raw.get("salary_max"),
            salary_interval=raw.get("salary_interval"),
            employment_type=raw.get("employment_type"),
            remote_type=_remote_type(raw.get("is_remote"), raw.get("location")),
            normalized_title=normalized_title,
            match_score=match["match_score"],
            match_explanation_json=json.dumps(match),
            search_id=search_record.id,
        )
        embeddings.upsert_job_embedding(
            job.id, job.title, job.description or "",
            metadata={"job_id": job.id, "company": job.company or "", "title": job.title,
                      "source": job.source or ""},
        )
        new_count += 1

    completed = repositories.complete_search(
        db, search_record.id,
        jobs_scanned=len(raw_jobs), new_jobs=new_count, duplicate_jobs=dup_count,
        errors=errors, sources=source_status, status="completed",
    )
    logger.info("[%s] Search completed: %d new, %d duplicates, %d errors",
                search_record.id, new_count, dup_count, len(errors))
    return {
        "search_id": completed.id,
        "jobs_scanned": len(raw_jobs),
        "new_jobs": new_count,
        "duplicate_jobs": dup_count,
        "errors": errors,
        "sources": source_status,
    }
