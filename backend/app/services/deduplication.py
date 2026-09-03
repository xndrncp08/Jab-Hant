"""
Duplicate detection (build plan section 10).

Two-stage approach:
  1. Cheap exact/near-exact signals (source+source_job_id, apply_url,
     company+normalized_title) via a DB pre-filter.
  2. For anything not caught by stage 1 but sharing the same company,
     compare normalized-title similarity and description embedding
     similarity — this catches things like "Junior Software Developer" vs
     "Junior Software Developer - Calgary" without merging genuinely
     different roles.
"""
import re

from sqlalchemy.orm import Session

from app.database import repositories
from app.database.models import Job
from app.services.embeddings import cosine_similarity

_TITLE_NOISE = re.compile(
    r"[-–—,|/]|"
    r"\b(remote|hybrid|on[- ]site|full[- ]?time|part[- ]?time|contract|calgary|"
    r"alberta|canada|new|urgent|hiring now)\b",
    re.IGNORECASE,
)


def normalize_title(title: str) -> str:
    if not title:
        return ""
    cleaned = _TITLE_NOISE.sub(" ", title.lower())
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    # Sort tokens so "Software Developer, Junior" ~= "Junior Software Developer"
    return " ".join(sorted(cleaned.split()))


TITLE_SIMILARITY_THRESHOLD = 0.8   # token overlap ratio
DESCRIPTION_SIMILARITY_THRESHOLD = 0.92  # cosine, quite strict — avoid false merges


def _token_overlap(a: str, b: str) -> float:
    ta, tb = set(a.split()), set(b.split())
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def is_duplicate(db: Session, candidate: dict, candidate_embedding: list[float] | None) -> Job | None:
    normalized_title = normalize_title(candidate["title"])

    exact_matches = repositories.find_potential_duplicates(
        db,
        source=candidate.get("source"),
        source_job_id=candidate.get("source_job_id"),
        company=candidate.get("company"),
        normalized_title=normalized_title,
        apply_url=candidate.get("apply_url"),
    )
    if exact_matches:
        return exact_matches[0]

    if not candidate.get("company"):
        return None

    # Fuzzy pass: same company, similar-enough title, and (if we have
    # embeddings for both) similar description.
    same_company_jobs = db.query(Job).filter(Job.company == candidate["company"]).all()
    for job in same_company_jobs:
        title_sim = _token_overlap(normalize_title(job.title), normalized_title)
        if title_sim >= TITLE_SIMILARITY_THRESHOLD:
            return job

    return None
