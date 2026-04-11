#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export PYTHONUNBUFFERED=1
export FASHN_WEIGHTS_DIR="${FASHN_WEIGHTS_DIR:-/workspace/fashn-vton-weights}"

TRYON_API_HOST="${TRYON_API_HOST:-0.0.0.0}"
TRYON_API_PORT="${TRYON_API_PORT:-8000}"

if [ -z "${TRYON_API_TOKEN:-}" ] && [ "${ALLOW_OPEN_TRYON_API:-false}" != "true" ]; then
  printf "TRYON_API_TOKEN is not set. Refusing to start an unauthenticated pod API.\n" >&2
  printf "Export TRYON_API_TOKEN first, or set ALLOW_OPEN_TRYON_API=true if you really want it open.\n" >&2
  exit 1
fi

exec python -m uvicorn service:app \
  --app-dir "${SCRIPT_DIR}" \
  --host "${TRYON_API_HOST}" \
  --port "${TRYON_API_PORT}" \
  --proxy-headers \
  --timeout-keep-alive 30
