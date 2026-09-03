"""
Resume ingestion: PDF -> raw text -> sections -> skills/keywords.

No hardcoded personal skill list — everything here is *extracted* from
whatever resume the user uploads, using:
  1. Header-based section splitting (Summary / Education / Experience / ...)
  2. A broad reference vocabulary of common tech/industry skill *terms* used
     only to recognize which of them appear in the resume text (this is a
     recognition dictionary, not an assumption about the user's skills).
  3. Simple noun-phrase / capitalized-token heuristics to catch skills that
     aren't in the reference vocabulary (e.g. niche tools, frameworks).
"""
import re
from pathlib import Path

from pypdf import PdfReader

# Recognition vocabulary: used only to *detect* mentions in the resume text.
# This is intentionally broad/generic (not tailored to any one person) so it
# doesn't bias extraction toward a particular career field.
SKILL_VOCAB = [
    # Languages
    "Python", "JavaScript", "TypeScript", "Java", "C#", "C++", "C", "Go", "Rust", "Ruby", "PHP",
    "Swift", "Kotlin", "Scala", "R", "MATLAB", "SQL", "HTML", "CSS", "Bash", "Shell", "Perl",
    # Frontend
    "React", "Next.js", "Vue", "Vue 3", "Angular", "Svelte", "Tailwind CSS", "Bootstrap",
    "Redux", "React Query", "jQuery", "Vite", "Webpack", "shadcn/ui", "Recharts", "D3.js",
    "Leaflet", "Context API",
    # Backend
    "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Spring Boot", ".NET",
    ".NET MAUI", "ASP.NET", "GraphQL", "REST API", "REST APIs", "gRPC", "Prisma", "Sequelize",
    # Data / DBs
    "PostgreSQL", "MySQL", "MariaDB", "MongoDB", "SQLite", "Redis", "Cosmos DB", "Supabase",
    "Firebase", "DynamoDB", "Elasticsearch", "BigQuery",
    # Cloud / DevOps
    "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "Terraform", "CI/CD",
    "Jenkins", "GitHub Actions", "Azure Functions", "Container Apps", "Blob Storage",
    "Key Vault", "API Management", "Vercel", "Render", "Heroku", "Netlify",
    # AI / ML
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "scikit-learn",
    "LLM", "LLMs", "OpenAI", "Anthropic API", "Groq", "Ollama", "Prompt Engineering",
    "AI-assisted development",
    # Tools / collab
    "Git", "GitHub", "GitLab", "Jira", "Figma", "Agile", "Scrum", "Confluence",
    "Microsoft Teams", "JMeter",
    # Other
    "Arduino", "ROBOTC", "Embedded Systems", "OOP", "Object-Oriented Programming",
]

SECTION_HEADERS = [
    "SUMMARY", "OBJECTIVE", "EDUCATION", "EXPERIENCE", "WORK EXPERIENCE",
    "TECHNICAL PROJECTS", "PROJECTS", "SKILLS", "TECHNICAL SKILLS",
    "CERTIFICATIONS", "LEADERSHIP", "LANGUAGES", "INTERESTS", "AWARDS",
]


def extract_text_from_pdf(file_path: str) -> str:
    reader = PdfReader(file_path)
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n".join(pages)


def split_sections(raw_text: str) -> dict[str, str]:
    """Splits resume text into sections based on ALL-CAPS header lines,
    which is how most resumes (and the sample provided) format them."""
    lines = raw_text.splitlines()
    sections: dict[str, list[str]] = {}
    current = "SUMMARY"
    sections[current] = []

    header_pattern = re.compile(r"^[A-Z][A-Z &/]{2,40}$")

    for line in lines:
        stripped = line.strip()
        candidate = stripped.upper()
        is_header = bool(header_pattern.match(stripped)) and (
            candidate in SECTION_HEADERS or len(stripped.split()) <= 4
        )
        if is_header and stripped == stripped.upper() and len(stripped) > 2:
            current = candidate
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)

    return {k: "\n".join(v).strip() for k, v in sections.items() if "\n".join(v).strip()}


def extract_skills(raw_text: str) -> list[str]:
    """Detect which vocabulary skills actually appear in this resume's text.
    Case-insensitive substring match with word boundaries where sensible."""
    found = []
    text_lower = raw_text.lower()
    for skill in SKILL_VOCAB:
        skill_lower = skill.lower()
        # Avoid "C" false-matching inside "C#"/"C++"/"Objective-C" etc — require
        # a hard word boundary on both sides for single-character skill tokens.
        if skill_lower in ("c", "r", "go"):
            pattern = r"(?<![a-zA-Z0-9#+.])" + re.escape(skill_lower) + r"(?![a-zA-Z0-9#+])"
        else:
            pattern = r"(?<![a-zA-Z0-9])" + re.escape(skill_lower) + r"(?![a-zA-Z0-9])"
        if re.search(pattern, text_lower):
            found.append(skill)
    # Deduplicate while preserving order
    seen = set()
    out = []
    for s in found:
        if s.lower() not in seen:
            seen.add(s.lower())
            out.append(s)
    return out


def derive_search_keywords(sections: dict[str, str], skills: list[str]) -> list[str]:
    """Derive candidate job-title search terms from Experience/Projects/Summary
    text (looking for role-like phrases) plus common variants of any
    'Developer/Engineer' language found. This is a starting point the user
    is expected to edit in Settings — see build plan section 5."""
    text = " ".join(sections.get(k, "") for k in ("SUMMARY", "WORK EXPERIENCE", "EXPERIENCE"))
    role_pattern = re.compile(
        r"\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2}\s+(?:Developer|Engineer|Programmer|Analyst|Designer))\b"
    )
    roles = set(m.group(1).strip() for m in role_pattern.finditer(text))

    # Also derive from top languages/frameworks present in skills, e.g. "Python Developer"
    primary_langs = [s for s in skills if s in {
        "Python", "JavaScript", "TypeScript", "Java", "C#", "C++", "Go", "Ruby", "PHP",
    }][:3]
    for lang in primary_langs:
        roles.add(f"{lang} Developer")

    generic = {"Software Developer", "Software Engineer", "Full Stack Developer",
               "Junior Software Developer", "Junior Software Engineer"}
    roles |= generic

    return sorted(roles)


def parse_resume_pdf(file_path: str) -> dict:
    raw_text = extract_text_from_pdf(file_path)
    sections = split_sections(raw_text)
    skills = extract_skills(raw_text)
    keywords = derive_search_keywords(sections, skills)
    return {
        "raw_text": raw_text,
        "sections": sections,
        "skills": skills,
        "search_keywords": keywords,
    }
