import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import repositories
from app.database.database import get_db
from app.database.models import JobStatus
from app.schemas import JobDetailOut, JobOut, JobUpdate

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("", response_model=list[JobOut])
def list_jobs(
    status: Optional[str] = None,
    min_match: Optional[float] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    remote_type: Optional[str] = None,
    source: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(200, le=1000),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    jobs = repositories.list_jobs(
        db, status=status, min_match=min_match, company=company, location=location,
        remote_type=remote_type, source=source, search_text=q, limit=limit, offset=offset,
    )
    return [_to_job_out(j) for j in jobs]


@router.get("/counts")
def job_counts(db: Session = Depends(get_db)):
    return repositories.job_counts_by_status(db)


@router.get("/{job_id}", response_model=JobDetailOut)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = repositories.get_job(db, job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return _to_job_detail_out(job)


@router.patch("/{job_id}", response_model=JobDetailOut)
def update_job(job_id: str, payload: JobUpdate, db: Session = Depends(get_db)):
    fields = payload.model_dump(exclude_unset=True)
    if "status" in fields and fields["status"] not in [s.value for s in JobStatus]:
        raise HTTPException(400, f"Invalid status. Must be one of {[s.value for s in JobStatus]}")
    job = repositories.update_job(db, job_id, **fields)
    if not job:
        raise HTTPException(404, "Job not found")
    return _to_job_detail_out(job)


def _to_job_out(job) -> dict:
    data = JobOut.model_validate(job).model_dump()
    data["remote_type"] = job.remote_type.value if job.remote_type else None
    data["status"] = job.status.value if job.status else "New"
    return data


def _to_job_detail_out(job) -> dict:
    data = _to_job_out(job)
    explanation = {}
    if job.match_explanation_json:
        try:
            explanation = json.loads(job.match_explanation_json)
        except (TypeError, ValueError):
            explanation = {}
    data.update({
        "matching_skills": explanation.get("matching_skills", []),
        "missing_skills": explanation.get("missing_skills", []),
        "reasons": explanation.get("reasons", []),
        "gaps": explanation.get("gaps", []),
    })
    return data