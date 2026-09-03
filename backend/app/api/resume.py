import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import settings
from app.database import repositories
from app.database.database import get_db
from app.database.models import Job
from app.services import embeddings, resume_parser
from app.services.resume_prompt import generate_resume_improvement_prompt

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload")
def upload_resume(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF resumes are supported. Please upload a .pdf file.")

    dest_dir = Path(settings.resume_storage_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / file.filename
    with open(dest_path, "wb") as f:
        f.write(file.file.read())

    parsed = resume_parser.parse_resume_pdf(str(dest_path))

    resume = repositories.create_resume(
        db, filename=file.filename, file_path=str(dest_path), raw_text=parsed["raw_text"],
        sections=parsed["sections"], skills=parsed["skills"], search_keywords=parsed["search_keywords"],
    )

    embeddings.upsert_resume_embeddings(resume.id, parsed["sections"], parsed["skills"])

    return _to_resume_out(resume)


@router.get("")
def get_active_resume(db: Session = Depends(get_db)):
    resume = repositories.get_active_resume(db)
    if not resume:
        raise HTTPException(404, "No resume uploaded yet.")
    return _to_resume_out(resume)


@router.post("/improvement-prompt")
def generate_improvement_prompt(db: Session = Depends(get_db)):
    resume = repositories.get_active_resume(db)
    if not resume:
        raise HTTPException(400, "Upload a resume first.")

    jobs = db.query(Job).filter(Job.status != "Archived").order_by(
        Job.match_score.desc().nullslast()).limit(50).all()
    if not jobs:
        raise HTTPException(400, "No jobs found yet. Run a search first.")

    job_dicts = [{"title": j.title, "company": j.company, "description": j.description,
                  "match_score": j.match_score} for j in jobs]

    prompt = generate_resume_improvement_prompt(
        resume_raw_text=resume.raw_text,
        resume_skills=json.loads(resume.skills_json),
        jobs=job_dicts,
    )
    return {"prompt": prompt}


def _to_resume_out(resume) -> dict:
    return {
        "id": resume.id,
        "filename": resume.filename,
        "sections": json.loads(resume.sections_json),
        "skills": json.loads(resume.skills_json),
        "search_keywords": json.loads(resume.search_keywords_json),
        "created_at": resume.created_at,
    }
