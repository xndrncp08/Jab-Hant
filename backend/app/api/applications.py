"""
Application-tracking specific views. Status changes themselves go through
PATCH /api/jobs/{id} (see api/jobs.py) — this router is for the
"my applications" slice of the data (build plan section 14).
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.jobs import _to_job_out
from app.database.database import get_db
from app.database.models import Job, JobStatus

router = APIRouter(prefix="/api/applications", tags=["applications"])

APPLICATION_STATUSES = [
    JobStatus.APPLIED.value, JobStatus.INTERVIEW.value, JobStatus.REJECTED.value, JobStatus.OFFER.value,
]


@router.get("")
def list_applications(db: Session = Depends(get_db)):
    jobs = (
        db.query(Job)
        .filter(Job.status.in_(APPLICATION_STATUSES))
        .order_by(Job.application_date.desc().nullslast())
        .all()
    )
    return [_to_job_out(j) for j in jobs]
