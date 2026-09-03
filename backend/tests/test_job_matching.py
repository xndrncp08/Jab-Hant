from app.services import job_matching


def test_extract_job_skills_finds_terms_in_description():
    desc = "We need someone with Python, React, and AWS experience."
    skills = job_matching.extract_job_skills(desc)
    assert set(skills) == {"Python", "React", "AWS"}


def test_guess_experience_level_entry():
    assert job_matching.guess_experience_level("Junior developer, entry level welcome") == "entry"


def test_guess_experience_level_senior():
    assert job_matching.guess_experience_level("Senior engineer, 10+ years required") == "senior"


def test_guess_experience_level_unspecified_defaults_neutral():
    assert job_matching.guess_experience_level("Great team, flexible hours") == "unspecified"


def test_score_experience_fit_favors_entry_over_senior():
    entry_score = job_matching.score_experience_fit("Junior developer role")
    senior_score = job_matching.score_experience_fit("Senior engineer, 10+ years")
    assert entry_score > senior_score


def test_score_location_fit_remote_scores_high_when_remote_ok():
    score = job_matching.score_location_fit(None, True, "Calgary, Alberta", remote_ok=True)
    assert score == 1.0


def test_score_location_fit_matching_city_scores_high():
    score = job_matching.score_location_fit("Calgary, AB", False, "Calgary, Alberta, Canada")
    assert score == 1.0


def test_score_location_fit_mismatched_city_scores_low():
    score = job_matching.score_location_fit("Toronto, ON", False, "Calgary, Alberta, Canada")
    assert score < 1.0


def test_compute_match_never_exceeds_100_or_goes_negative():
    result = job_matching.compute_match(
        resume_embedding=[1.0, 0.0, 0.0],
        job_embedding=[1.0, 0.0, 0.0],
        resume_skills=["Python", "React", "SQL"],
        job_description="Looking for a Python and React developer, junior level welcome.",
        job_location="Calgary, AB",
        is_remote=False,
        preferred_location="Calgary, Alberta, Canada",
    )
    assert 0 <= result["match_score"] <= 100
    assert result["is_estimate"] is True
    assert "Python" in result["matching_skills"] or "React" in result["matching_skills"]
