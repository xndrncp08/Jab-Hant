"""
Resume tailoring agent: rewrites the active resume for one job so an
applicant tracking system (ATS) parses it cleanly and finds the job's
keywords.

With ANTHROPIC_API_KEY set, Claude rewrites it (instructed never to invent
experience). Without a key, a local keyword pass moves the job's matching
skills to the top — no network, no cost.
"""
import anthropic
from fpdf import FPDF

from app.config import settings

MODEL = "claude-opus-5"

SYSTEM_PROMPT = """You tailor resumes for applicant tracking systems (ATS).

Rewrite the candidate's resume for the target job:
- Use only facts present in the original resume. Never invent employers, titles, dates, degrees, certifications, metrics, or skills.
- Where the candidate genuinely has a skill or tool the job asks for, use the job description's exact wording for it so ATS keyword matching finds it.
- Reorder sections and bullets so the most relevant experience comes first. Tighten bullets to start with strong verbs.
- ATS-safe formatting: plain text, single column, no tables, no graphics, no emojis. Standard headings in ALL CAPS on their own line (SUMMARY, SKILLS, EXPERIENCE, PROJECTS, EDUCATION, CERTIFICATIONS — only those that apply). Bullets start with "- ".
- Keep the candidate's name and contact line first, unchanged.
- One page for early-career candidates, two at most.

Output only the resume text, with nothing before or after it."""


class TailorError(RuntimeError):
    pass


def tailor_with_claude(resume_text: str, *, title: str, company: str | None, description: str) -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": (
                f"<job>\nTitle: {title}\nCompany: {company or 'Unknown'}\n\n{description}\n</job>\n\n"
                f"<resume>\n{resume_text}\n</resume>"
            ),
        }],
    )
    if response.stop_reason in ("refusal", "max_tokens"):
        raise TailorError(f"Claude stopped early ({response.stop_reason}); resume not tailored.")
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    if not text:
        raise TailorError("Claude returned an empty resume.")
    return text


def tailor_with_keywords(resume_text: str, resume_skills: list[str], matching_skills: list[str]) -> str:
    """Offline fallback: a SKILLS line led by the job's matching skills, placed
    right after the first line (the name, in nearly every resume)."""
    lead = matching_skills + [s for s in resume_skills if s not in matching_skills]
    name, _, rest = resume_text.strip().partition("\n")
    if not lead:
        return resume_text.strip()
    return f"{name}\n\nSKILLS\n{', '.join(lead)}\n\n{rest.strip()}".strip()


def tailor_resume(*, resume_text: str, resume_skills: list[str], title: str, company: str | None,
                  description: str, matching_skills: list[str]) -> tuple[str, str]:
    """Returns (content, generator)."""
    if settings.anthropic_api_key:
        return tailor_with_claude(resume_text, title=title, company=company, description=description), "claude"
    return tailor_with_keywords(resume_text, resume_skills, matching_skills), "keywords"


# Core PDF fonts are Latin-1 only; map the common typographic characters
# instead of dropping them. Plain ASCII is also what ATS parsers like best.
_PDF_CHARS = str.maketrans({
    "•": "-", "●": "-", "▪": "-", "◦": "-", "–": "-", "—": "-", "‐": "-",
    "‘": "'", "’": "'", "“": '"', "”": '"', "…": "...", " ": " ",
})


def render_pdf(text: str) -> bytes:
    pdf = FPDF(format="Letter")
    pdf.set_margins(18, 16, 18)
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    safe = text.translate(_PDF_CHARS).encode("latin-1", "replace").decode("latin-1")
    for line in safe.splitlines():
        stripped = line.strip()
        is_heading = stripped.isupper() and 0 < len(stripped) <= 40
        pdf.set_font("Helvetica", "B" if is_heading else "", 11 if is_heading else 10)
        pdf.multi_cell(0, 5, stripped or " ", new_x="LMARGIN", new_y="NEXT")
    return bytes(pdf.output())
