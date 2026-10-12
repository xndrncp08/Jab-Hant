import json
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import repositories
from app.database.database import Base
from app.database.models import Job, JobStatus
from app.services import auto_apply, resume_tailor

RESUME = "Jane Doe | jane@example.com\n\nEXPERIENCE\n• Built APIs in Python – shipped “fast”"


@pytest.fixture
def db(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "")  # never hit the network
    monkeypatch.setattr(resume_tailor.shutil, "which", lambda name: None)  # nor the local Claude Code
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    repositories.create_resume(session, filename="r.pdf", file_path="/tmp/r.pdf", raw_text=RESUME,
                               sections={}, skills=["Python", "SQL"], search_keywords=[])
    yield session
    session.close()


def _job(db, score, status=JobStatus.NEW, description="Python"):
    job = Job(title="Dev", company="Acme", description=description, match_score=score, status=status,
              match_explanation_json=json.dumps({"matching_skills": ["SQL"]}))
    db.add(job)
    db.commit()
    return job


def test_keywords_fallback_leads_with_matching_skills_after_name():
    out = resume_tailor.tailor_with_keywords(RESUME, ["Python", "SQL"], ["SQL"])
    assert out.splitlines()[0] == "Jane Doe | jane@example.com"
    assert "SKILLS\nSQL, Python" in out


def test_render_pdf_handles_unicode():
    pdf = resume_tailor.render_pdf(RESUME)
    assert pdf.startswith(b"%PDF")


def test_auto_apply_disabled_does_nothing(db):
    job = _job(db, 95)
    assert auto_apply.run_auto_apply(db)["prepared"] == 0
    assert job.status == JobStatus.NEW


def test_auto_apply_prepares_only_new_jobs_above_threshold_once(db):
    repositories.set_setting(db, "auto_apply_enabled", True)
    repositories.set_setting(db, "auto_apply_min_score", 80)
    high, low, applied = _job(db, 90), _job(db, 50), _job(db, 99, JobStatus.APPLIED)
    no_description = _job(db, 99, description=None)

    assert auto_apply.run_auto_apply(db)["prepared"] == 1
    assert high.status == JobStatus.READY_TO_APPLY
    assert low.status == JobStatus.NEW and applied.status == JobStatus.APPLIED
    assert no_description.status == JobStatus.NEW
    row = repositories.get_tailored_resume(db, high.id)
    assert row.generator == "keywords" and "SKILLS\nSQL, Python" in row.content

    assert auto_apply.run_auto_apply(db)["prepared"] == 0  # already tailored


def test_auto_apply_keeps_going_when_one_job_fails(db, monkeypatch):
    repositories.set_setting(db, "auto_apply_enabled", True)
    bad, good = _job(db, 95), _job(db, 90)
    real = resume_tailor.tailor_resume

    def flaky(**kw):
        if kw["description"] == "boom":
            raise RuntimeError("api down")
        return real(**kw)

    bad.description = "boom"
    db.commit()
    monkeypatch.setattr(resume_tailor, "tailor_resume", flaky)
    result = auto_apply.run_auto_apply(db)
    assert result["prepared"] == 1 and result["errors"][0]["job_id"] == bad.id
    assert bad.status == JobStatus.NEW and good.status == JobStatus.READY_TO_APPLY


def _fake_client(stop_reason, text="TAILORED"):
    response = SimpleNamespace(stop_reason=stop_reason, content=[SimpleNamespace(type="text", text=text)])
    create = lambda **kw: response  # noqa: E731
    return lambda **kw: SimpleNamespace(beta=SimpleNamespace(messages=SimpleNamespace(create=create)))


def test_claude_path_used_when_key_set(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "sk-test")
    monkeypatch.setattr(resume_tailor.anthropic, "Anthropic", _fake_client("end_turn"))
    content, generator = resume_tailor.tailor_resume(
        resume_text=RESUME, resume_skills=[], title="Dev", company=None, description="", matching_skills=[])
    assert (content, generator) == ("TAILORED", "claude")


def test_claude_refusal_raises(monkeypatch):
    monkeypatch.setattr(resume_tailor.anthropic, "Anthropic", _fake_client("refusal"))
    with pytest.raises(resume_tailor.TailorError):
        resume_tailor.tailor_with_claude(RESUME, title="Dev", company=None, description="")


def test_auto_apply_runs_only_after_morning_and_evening_searches(monkeypatch):
    from apscheduler.schedulers.background import BackgroundScheduler

    from app.scheduler import jobs

    calls = []
    monkeypatch.setattr(jobs, "scheduler", BackgroundScheduler())
    monkeypatch.setattr(jobs.scheduler, "start", lambda: None)
    monkeypatch.setattr(jobs, "_current_schedule", lambda: {
        "morning": "08:00", "afternoon": "12:00", "evening": "20:00", "timezone": "UTC"})
    monkeypatch.setattr(jobs, "run_search", lambda db, trigger: None)
    monkeypatch.setattr(jobs, "run_auto_apply_in_new_session", lambda: calls.append(1))
    jobs.start_scheduler()

    for job in jobs.scheduler.get_jobs():
        job.func(**job.kwargs)
    assert len(jobs.scheduler.get_jobs()) == 3 and len(calls) == 2


def test_claude_code_path_used_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "anthropic_api_key", "")
    monkeypatch.setattr(resume_tailor.shutil, "which", lambda name: "/bin/claude")
    seen = {}

    def fake_run(cmd, **kw):
        seen["cmd"] = cmd
        return SimpleNamespace(returncode=0, stdout="TAILORED\n", stderr="")

    monkeypatch.setattr(resume_tailor.subprocess, "run", fake_run)
    content, generator = resume_tailor.tailor_resume(
        resume_text=RESUME, resume_skills=[], title="Dev", company=None, description="", matching_skills=[])
    assert (content, generator) == ("TAILORED", "claude")
    assert seen["cmd"][seen["cmd"].index("--tools") + 1] == ""  # scraped text must never get tools


def test_claude_code_failure_raises(monkeypatch):
    monkeypatch.setattr(resume_tailor.subprocess, "run",
                        lambda cmd, **kw: SimpleNamespace(returncode=1, stdout="", stderr="not logged in"))
    with pytest.raises(resume_tailor.TailorError, match="not logged in"):
        resume_tailor.tailor_with_claude_code(RESUME, title="Dev", company=None, description="")
