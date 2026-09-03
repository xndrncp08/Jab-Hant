"""
Generates a copy-pasteable prompt for the user to manually give to an AI
model of their choice (build plan section 17). The app itself never
auto-edits the resume — this is deliberate (section 24).
"""
from collections import Counter

from app.services.job_matching import extract_job_skills


def build_keyword_frequency(job_descriptions: list[str]) -> Counter:
    counter = Counter()
    for desc in job_descriptions:
        for skill in set(extract_job_skills(desc)):
            counter[skill] += 1
    return counter


def generate_resume_improvement_prompt(*, resume_raw_text: str, resume_skills: list[str],
                                        jobs: list[dict], max_jobs: int = 15) -> str:
    """
    `jobs` is a list of dicts with at least: title, company, description,
    match_score. Highest-match jobs are prioritized and the description is
    truncated per-job to keep the overall prompt a reasonable size.
    """
    jobs_sorted = sorted(jobs, key=lambda j: j.get("match_score") or 0, reverse=True)[:max_jobs]

    freq = build_keyword_frequency([j.get("description", "") for j in jobs_sorted])
    frequent_skills = [skill for skill, _ in freq.most_common(15)]
    resume_skill_set = {s.lower() for s in resume_skills}
    missing_frequent = [s for s in frequent_skills if s.lower() not in resume_skill_set]

    job_blocks = []
    for i, job in enumerate(jobs_sorted, start=1):
        desc = (job.get("description") or "").strip()
        if len(desc) > 1200:
            desc = desc[:1200] + "..."
        match = job.get("match_score")
        match_str = f" (estimated match: {match}%)" if match is not None else ""
        job_blocks.append(
            f"[JOB {i}] {job.get('title', 'Untitled')} — {job.get('company', 'Unknown company')}{match_str}\n"
            f"{desc}"
        )

    prompt = f"""I want you to help me improve my resume for the jobs below.

Do NOT invent experience, education, projects, certifications, or skills.

Analyze my current resume against these job postings.

Identify:

1. Keywords I should emphasize.
2. Resume bullets that should be rewritten.
3. Skills I genuinely have that aren't emphasized enough.
4. Skills that appear frequently in these job descriptions.
5. Which parts of my resume should be reordered.
6. Which projects/experience should be emphasized.
7. Specific changes that would improve ATS compatibility.
8. Skills I should NOT add because I don't actually have them.

Skills already on my resume: {', '.join(resume_skills) if resume_skills else '(none extracted)'}

Skills that appear frequently across these job postings but are NOT currently on my resume
(do not claim these unless I genuinely have this experience — flag them for me to consider,
don't assume): {', '.join(missing_frequent) if missing_frequent else '(none detected)'}

Here is my resume:

{resume_raw_text}

Here are the jobs:

{chr(10).join(f"{chr(10)}{block}{chr(10)}" for block in job_blocks)}

Provide specific recommendations and rewritten examples where appropriate.
Do not fabricate qualifications.
"""
    return prompt
