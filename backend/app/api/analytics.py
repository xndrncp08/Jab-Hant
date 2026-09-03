import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import repositories
from app.database.database import get_db
from app.database.models import Job
from app.services.resume_prompt import build_keyword_frequency

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/keywords")
def keyword_analytics(db: Session = Depends(get_db)):
    """Cross-job keyword analysis (build plan section 18)."""
    resume = repositories.get_active_resume(db)
    resume_skills = {s.lower() for s in json.loads(resume.skills_json)} if resume else set()

    jobs = db.query(Job).filter(Job.status != "Archived").all()
    freq = build_keyword_frequency([j.description or "" for j in jobs])

    most_requested = [{"skill": skill, "count": count} for skill, count in freq.most_common(20)]

    strongly_represented, underrepresented, not_found = [], [], []
    total = len(jobs) or 1
    for skill, count in freq.items():
        ratio = count / total
        if skill.lower() in resume_skills:
            strongly_represented.append(skill)
        elif ratio >= 0.15:
            not_found.append(skill)
        elif ratio >= 0.05:
            underrepresented.append(skill)

    return {
        "most_requested": most_requested,
        "strongly_represented": sorted(strongly_represented),
        "underrepresented": sorted(underrepresented),
        "not_found": sorted(not_found),
        "jobs_analyzed": len(jobs),
    }


@router.get("/matches")
def match_analytics(db: Session = Depends(get_db)):
    jobs = db.query(Job).filter(Job.match_score.isnot(None)).all()
    buckets = {"90-100": 0, "75-89": 0, "50-74": 0, "0-49": 0}
    for j in jobs:
        score = j.match_score
        if score >= 90:
            buckets["90-100"] += 1
        elif score >= 75:
            buckets["75-89"] += 1
        elif score >= 50:
            buckets["50-74"] += 1
        else:
            buckets["0-49"] += 1
    avg = round(sum(j.match_score for j in jobs) / len(jobs), 1) if jobs else 0
    return {"buckets": buckets, "average_match_score": avg, "total_scored_jobs": len(jobs)}
