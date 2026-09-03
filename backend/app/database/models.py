"""
SQLAlchemy ORM models.

Kept intentionally flat/simple (SQLite, no migrations framework) — this is a
personal tool, not a multi-tenant SaaS product. If the schema needs to change,
it's fine to delete data/jobs.db and let the app recreate it (resume/jobs
will need re-importing).
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class JobStatus(str, enum.Enum):
    NEW = "New"
    INTERESTED = "Interested"
    APPLIED = "Applied"
    INTERVIEW = "Interview"
    REJECTED = "Rejected"
    OFFER = "Offer"
    ARCHIVED = "Archived"


class RemoteType(str, enum.Enum):
    REMOTE = "Remote"
    HYBRID = "Hybrid"
    ON_SITE = "On-site"
    UNKNOWN = "Unknown"


class Resume(Base):
    """Only one active resume is expected, but history is kept."""

    __tablename__ = "resumes"

    id = Column(String, primary_key=True, default=_uuid)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    raw_text = Column(Text, nullable=False)

    # Parsed sections, stored as JSON-ish text blobs (SQLite has no native JSON
    # index need here, keeping it simple with a text column + json.dumps).
    sections_json = Column(Text, nullable=False, default="{}")
    skills_json = Column(Text, nullable=False, default="[]")
    search_keywords_json = Column(Text, nullable=False, default="[]")

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=_now)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_uuid)

    title = Column(String, nullable=False, index=True)
    company = Column(String, nullable=True, index=True)
    location = Column(String, nullable=True)
    description = Column(Text, nullable=True)

    job_url = Column(String, nullable=True)      # listing page (always try to save)
    apply_url = Column(String, nullable=True)     # direct application URL if JobSpy provides one

    source = Column(String, nullable=True)        # e.g. "indeed", "linkedin"
    source_job_id = Column(String, nullable=True, index=True)

    date_posted = Column(DateTime, nullable=True)
    date_discovered = Column(DateTime, default=_now)

    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_interval = Column(String, nullable=True)  # yearly / hourly / etc
    employment_type = Column(String, nullable=True)  # fulltime / parttime / contract / internship
    remote_type = Column(Enum(RemoteType), default=RemoteType.UNKNOWN)

    # Normalized fields used for dedup / matching
    normalized_title = Column(String, nullable=True, index=True)

    match_score = Column(Float, nullable=True)        # 0-100, estimated
    match_explanation_json = Column(Text, nullable=True)  # {"matching_skills": [...], "gaps": [...], "reasons": [...]}

    status = Column(Enum(JobStatus), default=JobStatus.NEW, index=True)
    is_new = Column(Boolean, default=True)

    notes = Column(Text, nullable=True)
    application_date = Column(DateTime, nullable=True)

    search_id = Column(String, ForeignKey("searches.id"), nullable=True)

    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)

    search = relationship("Search", back_populates="jobs")


class Search(Base):
    """One row per search execution (scheduled or manual)."""

    __tablename__ = "searches"

    id = Column(String, primary_key=True, default=_uuid)

    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)

    trigger = Column(String, default="manual")  # "scheduled" | "manual"

    jobs_scanned = Column(Integer, default=0)
    new_jobs = Column(Integer, default=0)
    duplicate_jobs = Column(Integer, default=0)
    errors_json = Column(Text, default="[]")     # list of {"source": ..., "error": ...}
    sources_json = Column(Text, default="{}")    # {"indeed": "Success", "glassdoor": "Failed"}

    status = Column(String, default="running")   # running | completed | failed

    jobs = relationship("Job", back_populates="search")


class AppSetting(Base):
    """Simple key/value store for user-editable settings (search terms,
    location, schedule overrides, match-score weighting, etc.)."""

    __tablename__ = "settings"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=True)
