#!/usr/bin/env bash
set -euo pipefail

# Start backend + frontend together (dev-friendly).
# - Backend: FastAPI (uvicorn via `python run.py`)
# - Frontend: Expo web (`npm start` -> `expo start --web`)
#
# Usage:
#   chmod +x scripts/start-dev.sh
#   ./scripts/start-dev.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT"
FRONTEND_DIR="$REPO_ROOT/frontend"
VENV_DIR="$REPO_ROOT/venv"

BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  # Kill entire process group if possible
  if [[ -n "${BACKEND_PID:-}" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "${FRONTEND_PID:-}" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "Repo: $REPO_ROOT"

if [[ ! -d "$FRONTEND_DIR" ]]; then
  echo "ERROR: frontend directory not found at: $FRONTEND_DIR"
  exit 1
fi

echo ""
echo "Starting backend..."
cd "$BACKEND_DIR"

if [[ -d "$VENV_DIR" ]]; then
  # shellcheck disable=SC1091
  source "$VENV_DIR/bin/activate"
else
  echo "WARN: Python venv not found at: $VENV_DIR"
  echo "      Create it with: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Prefer `run.py` (it auto-disables reload when ENVIRONMENT=production).
BACKEND_HOST="$BACKEND_HOST" BACKEND_PORT="$BACKEND_PORT" python run.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (http://localhost:$BACKEND_PORT)"

echo ""
echo "Starting frontend..."
cd "$FRONTEND_DIR"

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "WARN: frontend/node_modules missing. Run:"
  echo "      cd \"$FRONTEND_DIR\" && npm install --legacy-peer-deps"
fi

npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "Both servers started."
echo "- Backend:  http://localhost:$BACKEND_PORT"
echo "- API docs: http://localhost:$BACKEND_PORT/docs"
echo "- Frontend: Expo will print the web URL in its logs"
echo ""
echo "Press Ctrl-C to stop both."

wait


