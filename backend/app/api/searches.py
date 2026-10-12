import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.jobs import _to_job_out
from app.database import repositories
from app.database.database import get_db
from app.database.models import Job
from app.schemas import SearchOut
from app.services.pipeline import run_search

router = APIRouter(prefix="/api/search", tags=["search"])


@router.post("")
def trigger_search(db: Session = Depends(get_db)):
    """'Run Search Now' — executes the exact same pipeline the scheduler uses."""
    try:
        result = run_search(db, trigger="manual")
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return result


@router.get("/history", response_model=list[SearchOut])
def search_history(db: Session = Depends(get_db)):
    searches = repositories.list_searches(db)
    return [_to_search_out(s) for s in searches]


@router.get("/{search_id}")
def search_detail(search_id: str, db: Session = Depends(get_db)):
    search = repositories.get_search(db, search_id)
    if not search:
        raise HTTPException(404, "Search not found")
    jobs = db.query(Job).filter(Job.search_id == search_id).all()
    out = _to_search_out(search)
    out["errors"] = json.loads(search.errors_json or "[]")
    out["sources"] = json.loads(search.sources_json or "{}")
    out["jobs"] = [_to_job_out(j) for j in jobs]
    return out


def _to_search_out(search) -> dict:
    data = SearchOut.model_validate(search).model_dump()
    return data
