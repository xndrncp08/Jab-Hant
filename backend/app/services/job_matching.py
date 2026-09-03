"""
Resume-to-job matching (build plan section 11).

Produces:
  - match_score: 0-100 estimated relevance (weighting configurable via
    settings; NEVER presented as objectively accurate — see section 11)
  - explanation: matching skills, gaps, and short human-readable reasons
    (build plan section 16), generated from the actual resume/job data —
    no generic filler text.

Default weights sum to 1.0:
  semantic     0.45  - resume-vs-job description embedding similarity
  skills       0.35  - overlap between resume skills and skills mentioned in the JD
  experience   0.10  - crude entry/mid/senior level match
  location     0.10  - remote/hybrid/on-site + geography fit
"""
import re

from app.services.embeddings import cosine_similarity
from app.services.resume_parser import SKILL_VOCAB

DEFAULT_WEIGHTS = {
    "semantic": 0.45,
    "skills": 0.35,
    "experience": 0.10,
    "location": 0.10,
}

_LEVEL_KEYWORDS = {
    "entry": ["junior", "entry level", "entry-level", "graduate", "new grad", "intern"],
    "mid": ["intermediate", "mid level", "mid-level"],
    "senior": ["senior", "lead", "staff", "principal", "5+ years", "7+ years", "10+ years"],
}


def extract_job_skills(description: str) -> list[str]:
    if not description:
        return []
    text_lower = description.lower()
    found = []
    for skill in SKILL_VOCAB:
        pattern = r"(?<![a-zA-Z0-9])" + re.escape(skill.lower()) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, text_lower):
            found.append(skill)
    return found


def guess_experience_level(text: str) -> str:
    text_lower = (text or "").lower()
    for level, kws in _LEVEL_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            return level
    return "unspecified"


def score_experience_fit(job_description: str, resume_years_hint: str = "entry") -> float:
    """Very rough heuristic: this resume is a 2026 grad (entry-level), so an
    entry/unspecified-level posting scores well; an explicitly senior one
    scores lower. Weighting is configurable/low by default because this
    signal is the least reliable of the four."""
    level = guess_experience_level(job_description)
    if level in ("entry", "unspecified"):
        return 1.0
    if level == "mid":
        return 0.6
    return 0.3  # senior


def score_location_fit(job_location: str, is_remote: bool | None, preferred_location: str,
                        remote_ok: bool = True) -> float:
    if is_remote:
        return 1.0 if remote_ok else 0.5
    if not job_location or not preferred_location:
        return 0.5
    job_loc_lower = job_location.lower()
    pref_tokens = [t.strip().lower() for t in preferred_location.split(",") if t.strip()]
    if any(t in job_loc_lower for t in pref_tokens):
        return 1.0
    return 0.3


def compute_match(
    *,
    resume_embedding: list[float],
    job_embedding: list[float],
    resume_skills: list[str],
    job_description: str,
    job_location: str | None,
    is_remote: bool | None,
    preferred_location: str,
    weights: dict | None = None,
) -> dict:
    weights = weights or DEFAULT_WEIGHTS

    semantic_sim = max(0.0, cosine_similarity(resume_embedding, job_embedding))  # roughly 0-1

    job_skills = extract_job_skills(job_description)
    resume_skill_set = {s.lower() for s in resume_skills}
    job_skill_set = {s.lower() for s in job_skills}

    matching_skills = sorted(resume_skill_set & job_skill_set)
    missing_skills = sorted(job_skill_set - resume_skill_set)

    skills_score = (len(matching_skills) / len(job_skill_set)) if job_skill_set else 0.5

    experience_score = score_experience_fit(job_description)
    location_score = score_location_fit(job_location, is_remote, preferred_location)

    overall = (
        weights["semantic"] * semantic_sim
        + weights["skills"] * skills_score
        + weights["experience"] * experience_score
        + weights["location"] * location_score
    )
    overall_pct = round(max(0.0, min(1.0, overall)) * 100, 1)

    reasons = []
    if matching_skills:
        shown = [s for s in resume_skills if s.lower() in matching_skills][:5]
        reasons.append(f"Your resume includes {', '.join(shown)}.")
    if semantic_sim > 0.5:
        reasons.append("The overall resume content is semantically well-aligned with this job description.")
    level = guess_experience_level(job_description)
    if level in ("entry", "unspecified"):
        reasons.append("The role appears suitable for an entry-level / new-grad candidate.")
    if is_remote:
        reasons.append("This position is remote.")
    elif location_score >= 1.0:
        reasons.append(f"The job location ({job_location}) matches your preferred location.")

    gaps = []
    if missing_skills:
        shown_gaps = [s for s in job_skills if s.lower() in missing_skills][:5]
        gaps.append(f"Job requests {', '.join(shown_gaps)}, not currently found in your resume.")
    if level == "senior":
        gaps.append("Job listing language suggests a senior-level position.")
    if is_remote is False and location_score < 1.0:
        gaps.append(f"Job is on-site at {job_location or 'an unspecified location'}, outside your preferred area.")

    return {
        "match_score": overall_pct,
        "matching_skills": [s for s in resume_skills if s.lower() in matching_skills],
        "missing_skills": [s for s in job_skills if s.lower() in missing_skills],
        "reasons": reasons,
        "gaps": gaps,
        "is_estimate": True,
    }
