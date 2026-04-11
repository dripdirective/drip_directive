#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import text

from app.config import settings

ROOT = Path(__file__).resolve().parent
BACKEND_ENV_FILE = ROOT / ".env"
FRONTEND_ENV_FILE = ROOT / "frontend_v2" / ".env"
DEFAULT_SECRET_PREFIXES = ("your-secret-key", "change-me")
DEFAULT_SECRET_VALUES = {
    "",
    "your-secret-key-change-this-in-production",
    "your-secret-key-change-this-in-production-use-a-random-string",
    "your-secret-key-here-change-in-production",
    "change-me",
}


def read_env_file(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")

    return values


def print_status(kind: str, message: str) -> None:
    print(f"[{kind}] {message}")


def is_default_secret(value: str) -> bool:
    if value in DEFAULT_SECRET_VALUES:
        return True
    return any(value.startswith(prefix) for prefix in DEFAULT_SECRET_PREFIXES)


def summarize_database_url(database_url: str) -> str:
    normalized = database_url.replace("postgres://", "postgresql://", 1)
    parsed = urlparse(normalized)
    host = parsed.hostname or "unknown-host"
    port = parsed.port or 5432
    database_name = (parsed.path or "/").lstrip("/") or "unknown-db"
    return f"{parsed.scheme}://{host}:{port}/{database_name}"


def main() -> int:
    backend_env = read_env_file(BACKEND_ENV_FILE)
    frontend_env = read_env_file(FRONTEND_ENV_FILE)

    errors: list[str] = []
    warnings: list[str] = []

    print("Dripdirective local setup check")
    print("")

    if BACKEND_ENV_FILE.exists():
        print_status("OK", f"Backend env file found at {BACKEND_ENV_FILE}")
    else:
        errors.append("Create .env in the repo root before starting the backend.")

    if FRONTEND_ENV_FILE.exists():
        print_status("OK", f"Frontend env file found at {FRONTEND_ENV_FILE}")
    else:
        warnings.append("frontend_v2/.env is missing. Copy frontend_v2/.env.example before running the web app.")

    if settings.DATABASE_URL:
        print_status("OK", f"DATABASE_URL loaded: {summarize_database_url(settings.DATABASE_URL)}")
    else:
        errors.append("DATABASE_URL is missing.")

    if is_default_secret(settings.SECRET_KEY):
        warnings.append("SECRET_KEY is still using a placeholder/default value.")
    else:
        print_status("OK", "SECRET_KEY is set.")

    provider = (settings.LLM_PROVIDER or "").strip().lower()
    if provider not in {"openai", "google"}:
        errors.append("LLM_PROVIDER must be either 'openai' or 'google'.")
    elif provider == "openai":
        if settings.OPENAI_API_KEY:
            print_status("OK", "OpenAI provider selected and OPENAI_API_KEY is present.")
        else:
            errors.append("LLM_PROVIDER=openai but OPENAI_API_KEY is missing.")
    else:
        if settings.GOOGLE_API_KEY:
            print_status("OK", "Google provider selected and GOOGLE_API_KEY is present.")
        else:
            errors.append("LLM_PROVIDER=google but GOOGLE_API_KEY is missing.")

    frontend_api_base = frontend_env.get("VITE_API_BASE_URL", "").strip()
    if frontend_api_base:
        print_status("OK", f"Frontend API base URL: {frontend_api_base}")
        if frontend_api_base.rstrip("/") not in {"http://localhost:8000", "http://127.0.0.1:8000"}:
            warnings.append(
                "frontend_v2/.env is pointing at a non-local API. Switch VITE_API_BASE_URL to http://localhost:8000 when testing the local backend."
            )
    else:
        warnings.append("VITE_API_BASE_URL is not set in frontend_v2/.env. The frontend will fall back to http://localhost:8000.")

    cors_origins = settings.parsed_cors_allow_origins()
    if "*" in cors_origins or "http://localhost:5174" in cors_origins:
        print_status("OK", "Backend CORS is compatible with the Vite dev server at http://localhost:5174.")
    else:
        warnings.append("CORS_ALLOW_ORIGINS does not include http://localhost:5174.")

    if settings.USE_S3:
        if settings.S3_BUCKET_NAME and settings.AWS_REGION:
            print_status("OK", f"S3 storage enabled for bucket '{settings.S3_BUCKET_NAME}' in region '{settings.AWS_REGION}'.")
        else:
            errors.append("USE_S3=true but S3_BUCKET_NAME or AWS_REGION is missing.")

        has_static_aws_creds = bool(settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY)
        has_profile = bool(settings.AWS_PROFILE or os.getenv("AWS_PROFILE"))
        if has_static_aws_creds:
            print_status("OK", "AWS static credentials are configured for local S3 access.")
        elif has_profile:
            print_status("OK", "AWS profile-based authentication is configured for local S3 access.")
        else:
            warnings.append(
                "USE_S3=true. Make sure AWS credentials are available via .env, AWS_PROFILE, or the default AWS credential chain before upload tests."
            )
    else:
        print_status("OK", "Local file storage is enabled.")

    tryon_provider = (backend_env.get("VIRTUAL_TRYON_PROVIDER") or settings.VIRTUAL_TRYON_PROVIDER or "legacy").strip().lower()
    if tryon_provider == "runpod_pod":
        if settings.RUNPOD_POD_API_URL and settings.RUNPOD_POD_API_TOKEN:
            print_status("OK", "Runpod Pod try-on configuration is present.")
        else:
            warnings.append("VIRTUAL_TRYON_PROVIDER=runpod_pod but RUNPOD_POD_API_URL or RUNPOD_POD_API_TOKEN is missing.")
    elif tryon_provider == "runpod":
        if settings.RUNPOD_API_KEY and settings.RUNPOD_TRYON_ENDPOINT_ID:
            print_status("OK", "Runpod Serverless try-on configuration is present.")
        else:
            warnings.append("VIRTUAL_TRYON_PROVIDER=runpod but RUNPOD_API_KEY or RUNPOD_TRYON_ENDPOINT_ID is missing.")
    else:
        warnings.append("VIRTUAL_TRYON_PROVIDER is not set. Local testing will use the legacy try-on path until Runpod is configured.")

    if not errors:
        try:
            from app.database import engine

            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print_status("OK", "Database connectivity test passed.")
        except Exception as exc:
            errors.append(f"Database connectivity test failed: {exc}")

    print("")

    for message in warnings:
        print_status("WARN", message)

    for message in errors:
        print_status("ERROR", message)

    print("")
    print("Local test targets")
    print("- Backend: http://localhost:8000")
    print("- Frontend: http://localhost:5174")
    print("- API docs: http://localhost:8000/docs")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
