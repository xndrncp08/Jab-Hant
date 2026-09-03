"""
Embedding generation + ChromaDB storage.

Everything here runs locally (sentence-transformers model downloaded once,
then cached) — no external API calls, no cost, no data leaving the machine.

Collections (see build plan section 19):
    resume_sections   - one entry per parsed resume section
    resume_skills      - one entry per extracted skill
    jobs                - one entry per job (title + description combined)
    job_requirements    - reserved for future per-requirement embeddings

Swapping to Qdrant/pgvector later: everything the rest of the app needs from
this module is the four functions at the bottom (`embed_text`,
`upsert_resume_embeddings`, `upsert_job_embedding`, `query_similar`). Keep
that function surface the same and only this file needs to change.
"""
import functools

import chromadb
from sentence_transformers import SentenceTransformer

from app.config import settings


@functools.lru_cache(maxsize=1)
def _model() -> SentenceTransformer:
    return SentenceTransformer(settings.embedding_model)


@functools.lru_cache(maxsize=1)
def _client() -> chromadb.ClientAPI:
    return chromadb.PersistentClient(path=settings.chroma_path)


def _collection(name: str):
    return _client().get_or_create_collection(name)


def embed_text(text: str) -> list[float]:
    if not text or not text.strip():
        return [0.0] * _model().get_sentence_embedding_dimension()
    return _model().encode(text, normalize_embeddings=True).tolist()


def embed_batch(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    return _model().encode(texts, normalize_embeddings=True).tolist()


# ---------------------------------------------------------------------------
# Resume embeddings
# ---------------------------------------------------------------------------

def upsert_resume_embeddings(resume_id: str, sections: dict[str, str], skills: list[str]) -> None:
    sections_col = _collection("resume_sections")
    if sections:
        ids = [f"{resume_id}:{name}" for name in sections]
        docs = list(sections.values())
        embeddings = embed_batch(docs)
        metadatas = [{"type": "resume_section", "section": name, "resume_id": resume_id}
                     for name in sections]
        sections_col.upsert(ids=ids, embeddings=embeddings, documents=docs, metadatas=metadatas)

    skills_col = _collection("resume_skills")
    if skills:
        ids = [f"{resume_id}:{skill}" for skill in skills]
        embeddings = embed_batch(skills)
        metadatas = [{"type": "resume_skill", "resume_id": resume_id} for _ in skills]
        skills_col.upsert(ids=ids, embeddings=embeddings, documents=skills, metadatas=metadatas)


def get_resume_overall_embedding(sections: dict[str, str]) -> list[float]:
    """A single embedding representing the whole resume, used for
    resume-vs-job semantic similarity. Weighted concatenation of the most
    relevant sections (Summary/Experience/Skills/Projects)."""
    priority = ["SUMMARY", "WORK EXPERIENCE", "EXPERIENCE", "TECHNICAL PROJECTS",
                "PROJECTS", "SKILLS", "TECHNICAL SKILLS"]
    parts = [sections[k] for k in priority if k in sections]
    if not parts:
        parts = list(sections.values())
    combined = "\n".join(parts)
    return embed_text(combined)


# ---------------------------------------------------------------------------
# Job embeddings
# ---------------------------------------------------------------------------

def upsert_job_embedding(job_id: str, title: str, description: str, metadata: dict) -> list[float]:
    jobs_col = _collection("jobs")
    doc = f"{title}\n\n{description or ''}"
    embedding = embed_text(doc)
    jobs_col.upsert(ids=[job_id], embeddings=[embedding], documents=[doc],
                     metadatas=[{**metadata, "type": "job"}])
    return embedding


def query_similar_jobs(embedding: list[float], n_results: int = 5) -> dict:
    jobs_col = _collection("jobs")
    count = jobs_col.count()
    if count == 0:
        return {"ids": [[]], "distances": [[]], "metadatas": [[]]}
    return jobs_col.query(query_embeddings=[embedding], n_results=min(n_results, count))


def delete_job_embedding(job_id: str) -> None:
    try:
        _collection("jobs").delete(ids=[job_id])
    except Exception:
        pass


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Embeddings from sentence-transformers here are already normalized, so
    dot product == cosine similarity."""
    return float(sum(x * y for x, y in zip(a, b)))
