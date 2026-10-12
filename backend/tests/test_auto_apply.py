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
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    repositories.create_resume(session, filename="r.pdf", file_path="/tmp/r.pdf", raw_text=RESUME,
                               sections={}, skills=["Python", "SQL"], search_keywords=[])
    yield session
    session.close()


def _job(db, score, status=JobStatus.NEW):
    job = Job(title="Dev", company="Acme", description="Python", match_score=score, status=status,
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

    assert auto_apply.run_auto_apply(db)["prepared"] == 1
    assert high.status == JobStatus.READY_TO_APPLY
    assert low.status == JobStatus.NEW and applied.status == JobStatus.APPLIED
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


def test_manual_search_schedules_auto_apply_after_responding(monkeypatch):
    from fastapi import BackgroundTasks

    from app.api import searches

    monkeypatch.setattr(searches, "run_search", lambda db, trigger: {"new_jobs": 0})
    tasks = BackgroundTasks()
    assert searches.trigger_search(tasks, db=None) == {"new_jobs": 0}
    assert [t.func for t in tasks.tasks] == [searches.run_auto_apply_in_new_session]
