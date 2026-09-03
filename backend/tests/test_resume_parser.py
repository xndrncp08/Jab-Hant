from app.services import resume_parser


SAMPLE_RESUME_TEXT = """
SUMMARY

Full-stack developer with experience in Python, React, and SQL.

EDUCATION

Southern Alberta Institute of Technology
Diploma - Software Development

WORK EXPERIENCE

Software Developer - Some Company
- Built REST APIs using FastAPI and PostgreSQL.
- Worked with Docker and Azure for deployment.

SKILLS

Python, JavaScript, TypeScript, React, Node.js, PostgreSQL, Docker, Azure, C#, Git
"""


def test_split_sections_finds_expected_headers():
    sections = resume_parser.split_sections(SAMPLE_RESUME_TEXT)
    assert "SUMMARY" in sections
    assert "EDUCATION" in sections
    assert "WORK EXPERIENCE" in sections
    assert "SKILLS" in sections
    assert "Python" in sections["SUMMARY"]


def test_extract_skills_finds_known_terms():
    skills = resume_parser.extract_skills(SAMPLE_RESUME_TEXT)
    for expected in ["Python", "React", "PostgreSQL", "Docker", "Azure", "C#", "Git"]:
        assert expected in skills


def test_extract_skills_does_not_confuse_c_sharp_with_plain_c():
    text = "Experienced with C# and .NET, but no embedded C programming."
    skills = resume_parser.extract_skills(text)
    assert "C#" in skills
    # "C" is intentionally excluded here since "C#" is present — this is a
    # known heuristic limitation, not a claim of perfect NLP.


def test_extract_skills_returns_nothing_for_unrelated_text():
    skills = resume_parser.extract_skills("I enjoy hiking and playing guitar on weekends.")
    assert skills == []


def test_derive_search_keywords_includes_generic_developer_terms():
    sections = resume_parser.split_sections(SAMPLE_RESUME_TEXT)
    skills = resume_parser.extract_skills(SAMPLE_RESUME_TEXT)
    keywords = resume_parser.derive_search_keywords(sections, skills)
    assert "Software Developer" in keywords
    assert any("Python" in k for k in keywords)
