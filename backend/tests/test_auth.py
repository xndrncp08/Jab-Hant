"""
Tests for app.auth.auth_middleware.

Uses a minimal, isolated FastAPI app (not the real app.main) so these tests
don't require the heavier ML/JobSpy dependencies to be installed — the
middleware only depends on app.config, which is lightweight.
"""
import base64

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.auth import auth_middleware
from app.config import settings


def _basic_header(username: str, password: str) -> str:
    token = base64.b64encode(f"{username}:{password}".encode()).decode()
    return f"Basic {token}"


def _build_app() -> FastAPI:
    app = FastAPI()
    app.middleware("http")(auth_middleware)

    @app.get("/")
    def root():
        return {"page": "spa-shell"}

    @app.get("/assets/app.js")
    def static_asset():
        return {"page": "static-asset"}

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    @app.get("/api/jobs")
    def jobs():
        return {"jobs": []}

    return app


@pytest.fixture
def auth_configured(monkeypatch):
    monkeypatch.setattr(settings, "app_username", "testuser")
    monkeypatch.setattr(settings, "app_password", "testpass123")
    return TestClient(_build_app())


@pytest.fixture
def auth_disabled(monkeypatch):
    monkeypatch.setattr(settings, "app_username", "")
    monkeypatch.setattr(settings, "app_password", "")
    return TestClient(_build_app())


# --- Auth disabled (local dev default) ---

def test_auth_disabled_allows_frontend_without_credentials(auth_disabled):
    resp = auth_disabled.get("/")
    assert resp.status_code == 200


def test_auth_disabled_allows_api_without_credentials(auth_disabled):
    resp = auth_disabled.get("/api/jobs")
    assert resp.status_code == 200


# --- Auth configured ---

def test_frontend_shell_loads_without_credentials(auth_configured):
    """The SPA shell must always load unauthenticated so the login screen
    itself can render — this is the key difference from native Basic Auth."""
    resp = auth_configured.get("/")
    assert resp.status_code == 200


def test_static_assets_load_without_credentials(auth_configured):
    resp = auth_configured.get("/assets/app.js")
    assert resp.status_code == 200


def test_health_check_never_requires_credentials(auth_configured):
    resp = auth_configured.get("/api/health")
    assert resp.status_code == 200


def test_api_route_rejects_missing_credentials(auth_configured):
    resp = auth_configured.get("/api/jobs")
    assert resp.status_code == 401


def test_api_route_response_has_no_www_authenticate_header(auth_configured):
    """Critical: if this header were present, the browser would show its
    own native login popup instead of our custom login screen."""
    resp = auth_configured.get("/api/jobs")
    assert "WWW-Authenticate" not in resp.headers


def test_api_route_rejects_wrong_password(auth_configured):
    resp = auth_configured.get("/api/jobs", headers={"Authorization": _basic_header("testuser", "wrongpass")})
    assert resp.status_code == 401


def test_api_route_rejects_wrong_username(auth_configured):
    resp = auth_configured.get("/api/jobs", headers={"Authorization": _basic_header("wronguser", "testpass123")})
    assert resp.status_code == 401


def test_api_route_rejects_malformed_auth_header(auth_configured):
    resp = auth_configured.get("/api/jobs", headers={"Authorization": "NotBasic garbage"})
    assert resp.status_code == 401


def test_api_route_accepts_correct_credentials(auth_configured):
    resp = auth_configured.get("/api/jobs", headers={"Authorization": _basic_header("testuser", "testpass123")})
    assert resp.status_code == 200
    assert resp.json() == {"jobs": []}