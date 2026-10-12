"""
Auto-apply agent. Runs after every search (scheduled or manual):

    new jobs at/above the auto-apply score
        -> tailor the resume for each one (resume_tailor.py)
        -> save it and move the job to "Ready to apply"

It stops short of submitting applications: job boards have no public
apply API, and scripted submission breaks their terms and trips CAPTCHAs.
What's left for you is one click: open the apply link, attach the PDF,
then mark the job Applied.
"""
import json
import logging

from sqlalchemy.orm import Session

from app.database import repositories
from app.database.database import SessionLocal
from app.database.models import Job, JobStatus, TailoredResume
from app.services import resume_tailor

logger = logging.getLogger("job_hunter.auto_apply")

DEFAULT_MIN_SCORE = 70
# Caps API spend per run; the rest get picked up on the next run.
MAX_PER_RUN = 10


def tailor_job(db: Session, job: Job, resume) -> TailoredResume:
    explanation = json.loads(job.match_explanation_json or "{}")
    content, generator = resume_tailor.tailor_resume(
        resume_text=resume.raw_text,
        resume_skills=json.loads(resume.skills_json),
        title=job.title,
        company=job.company,
        description=job.description or "",
        matching_skills=explanation.get("matching_skills", []),
    )
    return repositories.save_tailored_resume(db, job.id, content=content, generator=generator)


def run_auto_apply(db: Session) -> dict:
    if not repositories.get_setting(db, "auto_apply_enabled", default=False):
        return {"enabled": False, "prepared": 0, "errors": []}
    resume = repositories.get_active_resume(db)
    if resume is None:
        return {"enabled": True, "prepared": 0, "errors": []}

    min_score = float(repositories.get_setting(db, "auto_apply_min_score", default=DEFAULT_MIN_SCORE))
    candidates = (
        db.query(Job)
        .outerjoin(TailoredResume, TailoredResume.job_id == Job.id)
        .filter(Job.status == JobStatus.NEW, Job.match_score >= min_score, TailoredResume.job_id.is_(None))
        .order_by(Job.match_score.desc())
        .limit(MAX_PER_RUN)
        .all()
    )

    prepared, errors = 0, []
    for job in candidates:
        try:
            tailor_job(db, job, resume)
        except Exception as exc:  # one bad job (API hiccup) must not stop the rest
            logger.exception("Tailoring failed for job %s", job.id)
            db.rollback()
            errors.append({"job_id": job.id, "error": str(exc)})
            continue
        job.status = JobStatus.READY_TO_APPLY
        db.commit()
        prepared += 1

    logger.info("Auto-apply prepared %d job(s), %d error(s)", prepared, len(errors))
    return {"enabled": True, "prepared": prepared, "errors": errors}


def run_auto_apply_in_new_session() -> None:
    """Entry point for the scheduler and API background tasks, which outlive
    the request's DB session."""
    db = SessionLocal()
    try:
        run_auto_apply(db)
    except Exception:
        logger.exception("Auto-apply failed")
    finally:
        db.close()
