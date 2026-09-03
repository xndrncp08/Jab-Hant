"""
Wraps JobSpy so a failure on one job board never kills the whole search
(build plan section 25). Each configured source is queried independently.
"""
import logging
import math
from datetime import datetime
from typing import Optional

import pandas as pd

logger = logging.getLogger("job_hunter.job_search")


def _clean(value):
    """JobSpy/pandas returns NaN for missing values — normalize to None."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _row_to_dict(row: pd.Series, source: str) -> dict:
    date_posted = _clean(row.get("date_posted"))
    if isinstance(date_posted, (pd.Timestamp, datetime)):
        date_posted = date_posted.to_pydatetime() if isinstance(date_posted, pd.Timestamp) else date_posted

    # JobSpy's "job_url_direct" is the closest thing to a real "apply directly"
    # link when the board exposes one; otherwise fall back to the listing URL.
    apply_url = _clean(row.get("job_url_direct"))
    job_url = _clean(row.get("job_url"))

    return {
        "title": _clean(row.get("title")) or "Untitled",
        "company": _clean(row.get("company")),
        "location": _clean(row.get("location")),
        "description": _clean(row.get("description")),
        "job_url": job_url,
        # Never fabricate an apply URL — only set it if JobSpy actually gave us one.
        "apply_url": apply_url,
        "source": source,
        "source_job_id": _clean(row.get("id")) or _clean(row.get("job_url")),
        "date_posted": date_posted,
        "salary_min": _clean(row.get("min_amount")),
        "salary_max": _clean(row.get("max_amount")),
        "salary_interval": _clean(row.get("interval")),
        "employment_type": _clean(row.get("job_type")),
        "is_remote": bool(_clean(row.get("is_remote"))) if _clean(row.get("is_remote")) is not None else None,
    }


def search_jobs(
    search_terms: list[str],
    *,
    location: str,
    country: str,
    distance: int,
    results_per_site: int,
    boards: list[str],
) -> tuple[list[dict], dict[str, str], list[dict]]:
    """
    Runs one JobSpy query per (search_term) across all configured boards.
    JobSpy itself queries all requested `site_name`s in one call and already
    isolates some per-site errors internally, but we still wrap the whole
    call per search term so one bad term/board combo can't wipe out results
    for the others.

    Returns:
        jobs: flattened list of normalized job dicts (deduped is NOT done here)
        source_status: {"indeed": "Success", "glassdoor": "Failed", ...}
        errors: [{"source": ..., "term": ..., "error": "..."}]
    """
    try:
        from jobspy import scrape_jobs
    except ImportError:
        logger.error("python-jobspy is not installed — run `pip install -r requirements.txt`")
        return [], {b: "Failed" for b in boards}, [
            {"source": "all", "term": "n/a", "error": "python-jobspy not installed"}
        ]

    all_jobs: list[dict] = []
    source_status: dict[str, str] = {b: "Success" for b in boards}
    errors: list[dict] = []

    for term in search_terms:
        try:
            df = scrape_jobs(
                site_name=boards,
                search_term=term,
                location=location,
                distance=distance,
                results_wanted=results_per_site,
                country_indeed=country,
                linkedin_fetch_description=True,
            )
        except Exception as exc:  # JobSpy can raise for many reasons per-board
            logger.exception("JobSpy search failed for term=%s", term)
            errors.append({"source": "multiple", "term": term, "error": str(exc)})
            for b in boards:
                source_status[b] = "Failed"
            continue

        if df is None or df.empty:
            continue

        for _, row in df.iterrows():
            source = _clean(row.get("site")) or "unknown"
            try:
                all_jobs.append(_row_to_dict(row, source))
            except Exception as exc:
                errors.append({"source": source, "term": term, "error": f"row parse error: {exc}"})

    return all_jobs, source_status, errors
