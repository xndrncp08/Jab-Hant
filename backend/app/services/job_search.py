"""
Wraps JobSpy so a failure on one job board never kills the whole search
(build plan section 25). Each configured source is queried independently.

Search terms are queried concurrently (each term is an independent network
round-trip to JobSpy, so this is a straightforward win — with 8 terms this
typically cuts wall-clock time by roughly 4-6x on a normal connection,
though total time still depends on how slow/rate-limited the boards
themselves are being that day).
"""
import logging
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional

import pandas as pd

logger = logging.getLogger("job_hunter.job_search")

# How many search terms to run at once. JobSpy itself queries all configured
# boards within a single call, so this controls term-level concurrency only.
# Keep this modest — too high increases the odds of tripping a board's rate
# limiter across the board simultaneously.
MAX_CONCURRENT_TERMS = 4


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


def _search_one_term(term: str, *, boards: list[str], location: str, country: str,
                      distance: int, results_per_site: int) -> tuple[str, list[dict], dict[str, str], list[dict]]:
    """Runs a single term across all boards. Isolated so a crash on one term
    (e.g. a board timing out) can't take down the others running in parallel."""
    from jobspy import scrape_jobs

    jobs: list[dict] = []
    source_status: dict[str, str] = {b: "Success" for b in boards}
    errors: list[dict] = []

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
        return term, jobs, source_status, errors

    if df is None or df.empty:
        return term, jobs, source_status, errors

    for _, row in df.iterrows():
        source = _clean(row.get("site")) or "unknown"
        try:
            jobs.append(_row_to_dict(row, source))
        except Exception as exc:
            errors.append({"source": source, "term": term, "error": f"row parse error: {exc}"})

    return term, jobs, source_status, errors


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
    Runs one JobSpy query per search term, across all configured boards,
    with several terms in flight concurrently (see MAX_CONCURRENT_TERMS).
    A failure on one term/board never wipes out results from the others.

    Returns:
        jobs: flattened list of normalized job dicts (dedup is NOT done here)
        source_status: {"indeed": "Success", "glassdoor": "Failed", ...}
            (worst-case across all terms — if a board failed for any term,
            it's reported as "Failed" here even if it succeeded for others)
        errors: [{"source": ..., "term": ..., "error": "..."}]
    """
    try:
        import jobspy  # noqa: F401  (import check only; scrape_jobs is imported per-thread)
    except ImportError:
        logger.error("python-jobspy is not installed — run `pip install -r requirements.txt`")
        return [], {b: "Failed" for b in boards}, [
            {"source": "all", "term": "n/a", "error": "python-jobspy not installed"}
        ]

    all_jobs: list[dict] = []
    source_status: dict[str, str] = {b: "Success" for b in boards}
    errors: list[dict] = []

    with ThreadPoolExecutor(max_workers=min(MAX_CONCURRENT_TERMS, max(1, len(search_terms)))) as pool:
        futures = {
            pool.submit(
                _search_one_term, term, boards=boards, location=location, country=country,
                distance=distance, results_per_site=results_per_site,
            ): term
            for term in search_terms
        }
        for future in as_completed(futures):
            term = futures[future]
            try:
                _, jobs, term_source_status, term_errors = future.result()
            except Exception as exc:  # should be rare — _search_one_term already catches JobSpy errors
                logger.exception("Unexpected failure searching term=%s", term)
                errors.append({"source": "pipeline", "term": term, "error": str(exc)})
                continue

            all_jobs.extend(jobs)
            errors.extend(term_errors)
            for board, status in term_source_status.items():
                if status == "Failed":
                    source_status[board] = "Failed"

    return all_jobs, source_status, errors