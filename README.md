# Job Hunter

A personal job-search dashboard that searches job boards on a schedule,
ranks results against your resume, and gives you a simple place to review
and track applications. Runs entirely on your own machine.

```
FastAPI + SQLite + ChromaDB + React  ·  job search via JobSpy
```

No account, no cloud service, no required paid API. Your resume and job
data never leave your Mac unless you explicitly configure an external AI
API for the (optional) improvement-prompt feature — and even then, that
feature only ever generates a prompt for you to paste elsewhere; nothing is
sent automatically.

---

## Requirements

- Python 3.11+
- Node.js 18+ and npm

## Installation

```bash
git clone <this-repo>
cd jabHunter

# Backend
python3 -m venv backend/.venv
source backend/.venv/bin/activate      # Windows: backend\.venv\Scripts\activate
pip install -r backend/requirements.txt

cp backend/.env.example backend/.env   # edit if you want different defaults

# Frontend
cd frontend
npm install
cd ..
```

The first backend startup will download the local embedding model
(`all-MiniLM-L6-v2`, ~90MB, via `sentence-transformers`) — this requires
internet access once; after that it's cached locally and no further network
calls are made for matching.

## Running

**Backend** (from `backend/`, with the venv active):

```bash
uvicorn app.main:app --reload
```

Runs at `http://localhost:8000`. Interactive API docs at
`http://localhost:8000/docs`. This also starts the background scheduler
(8 AM / 12 PM / 8 PM by default — see Configuring the schedule below).

**Frontend** (from `frontend/`, in a separate terminal):

```bash
npm run dev
```

Runs at `http://localhost:5173`. Open that in your browser.

If your backend runs on a different host/port, set `VITE_API_URL` in a
`frontend/.env` file (e.g. `VITE_API_URL=http://localhost:8000`).

## First-time setup

1. Open the app and go to **Settings**.
2. Upload your resume as a **PDF**. The app extracts your sections, skills,
   and a starting set of search-term suggestions — all pulled from your
   actual resume text, nothing hardcoded or assumed.
3. Review/edit the search terms, location, and other search settings on
   that same page, then **Save settings**.
4. Click **Run search now** on the Dashboard to trigger your first search.
   From then on, it also runs automatically at the scheduled times.

## How matching works

Each job gets an estimated 0–100 match score combining:

- **Semantic similarity** (45%) — a local embedding model compares your
  resume's content against the job description.
- **Skill overlap** (35%) — skills detected in your resume vs. skills
  detected in the job posting.
- **Experience level fit** (10%) — a rough heuristic based on language like
  "junior"/"senior"/"5+ years" in the posting.
- **Location fit** (10%) — remote/hybrid/on-site and geographic match
  against your preferred location.

Weights are configurable (see `app/services/job_matching.py`). The score is
always an *estimate*, and the UI labels it as such — it's meant to help you
triage, not as a guarantee of fit.

## Where your data lives

- `data/jobs.db` — SQLite database (jobs, searches, resume text, settings)
- `data/chroma/` — ChromaDB vector store (resume + job embeddings)
- `data/resume/` — uploaded resume PDFs

None of these are committed to git (see `.gitignore`). Delete the whole
`data/` folder at any time to start fresh — the app recreates it on next
startup.

## Configuring the schedule

Default search times are 8:00 AM, 12:00 PM, and 8:00 PM in
`America/Edmonton`. Change them either in `backend/.env` before first run,
or anytime from the **Settings** page in the app (takes effect immediately,
no restart needed).

## Job board coverage & limitations

Job search is powered by [JobSpy](https://github.com/speedyapply/JobSpy),
which currently supports Indeed, LinkedIn, Glassdoor, ZipRecruiter, and
Google Jobs. A few things worth knowing:

- Job boards change their page structure and rate-limit scrapers
  periodically. If a board starts failing, check the Search History page —
  each run records per-source success/failure so one broken source never
  blocks the others.
- LinkedIn in particular is prone to rate-limiting with frequent searches;
  if you see repeated LinkedIn failures, consider trimming the
  `job_boards` list in Settings or spacing out manual searches.
- Not every posting includes a direct "apply" URL — some boards only
  expose a listing page. The app never fabricates an apply link; if one
  isn't available it says so explicitly ("Application link unavailable").
- JobSpy does not use any official job-board APIs; treat it as best-effort.
  Respect each site's terms of use for your own search volume/frequency.

## Resume improvement prompt

The **Insights** page has a **Generate prompt** button that builds a
detailed prompt — your resume plus the jobs you've found, organized by
match score and requested skills — for you to paste into ChatGPT, Claude,
or any AI tool of your choice. The app itself never edits your resume
automatically; you stay in control of what changes, based on your own
judgment about what's actually true.

## Project structure

```
job-hunter/
├── backend/
│   ├── app/
│   │   ├── main.py              FastAPI app entrypoint
│   │   ├── config.py            Settings (env-driven)
│   │   ├── api/                 REST endpoints
│   │   ├── services/            Resume parsing, embeddings, matching,
│   │   │                        dedup, JobSpy wrapper, pipeline orchestrator
│   │   ├── database/            SQLAlchemy models + repositories
│   │   └── scheduler/           APScheduler (8am/12pm/8pm)
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── pages/                Dashboard, JobDetail, Applications,
│       │                         SearchHistory, Insights, Settings
│       ├── components/           Sidebar, JobRow, status/score badges
│       └── api/client.js         Thin fetch wrapper around the backend
└── data/                          SQLite db, ChromaDB store, resume files
```

## Testing

```bash
cd backend
source .venv/bin/activate
pytest
```

(A starter test suite isn't bundled by default — add tests under
`backend/tests/` covering resume parsing, deduplication, and match scoring
as you extend the app; the service functions in `app/services/` are written
to be testable in isolation, with no network calls required for anything
except the JobSpy search call and the one-time embedding-model download.)

## Future improvements (not built yet)

- Qdrant/pgvector backend swap (the embeddings module is already isolated
  behind a small function surface to make this straightforward)
- Per-requirement embeddings (the `job_requirements` Chroma collection is
  reserved but unused)
- Browser/desktop notifications when high-match jobs are found
- CSV export of tracked applications
- Auto-retry with backoff for rate-limited job boards
