"""Pydantic request/response models."""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    job_url: Optional[str] = None
    apply_url: Optional[str] = None
    source: Optional[str] = None
    date_posted: Optional[datetime] = None
    date_discovered: datetime
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    employment_type: Optional[str] = None
    remote_type: Optional[str] = None
    match_score: Optional[float] = None
    status: str
    is_new: bool
    notes: Optional[str] = None
    application_date: Optional[datetime] = None


class JobDetailOut(JobOut):
    matching_skills: list[str] = []
    missing_skills: list[str] = []
    reasons: list[str] = []
    gaps: list[str] = []


class JobUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class SearchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    trigger: str
    jobs_scanned: int
    new_jobs: int
    duplicate_jobs: int
    status: str


class ResumeOut(BaseModel):
    id: str
    filename: str
    sections: dict
    skills: list[str]
    search_keywords: list[str]
    created_at: datetime


class SettingsUpdate(BaseModel):
    values: dict
