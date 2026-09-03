# Multi-stage build: builds the React frontend, then runs the FastAPI
# backend which serves both the API and the built frontend as static files.

# --- Stage 1: build frontend ---
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: backend + serve built frontend ---
FROM python:3.12-slim
WORKDIR /app

# System deps some Python packages (e.g. chromadb's onnxruntime) may need
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Persistent data directory — mount a volume here on your host so your
# resume, database, and vector store survive restarts/redeploys.
RUN mkdir -p /app/data/chroma /app/data/resume
VOLUME ["/app/data"]

WORKDIR /app/backend
EXPOSE 8000

# Pre-download the embedding model at build time so first request isn't slow
# and so the container doesn't need outbound internet access at runtime for
# this (JobSpy searches still need internet, obviously).
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]