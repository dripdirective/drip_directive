#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${TRYON_LOG_DIR:-/workspace/logs}"
LOG_FILE="${TRYON_LOG_FILE:-${LOG_DIR}/fashn-vton-api.log}"
PID_FILE="${TRYON_PID_FILE:-${LOG_DIR}/fashn-vton-api.pid}"

mkdir -p "${LOG_DIR}"

if [ -f "${PID_FILE}" ]; then
  EXISTING_PID="$(cat "${PID_FILE}" 2>/dev/null || true)"
  if [ -n "${EXISTING_PID}" ] && kill -0 "${EXISTING_PID}" 2>/dev/null; then
    printf "API already running with PID %s\n" "${EXISTING_PID}"
    printf "Log file: %s\n" "${LOG_FILE}"
    exit 0
  fi
fi

nohup "${SCRIPT_DIR}/start_api.sh" >"${LOG_FILE}" 2>&1 &
PID="$!"
echo "${PID}" > "${PID_FILE}"

printf "Started FASHN pod API with PID %s\n" "${PID}"
printf "Log file: %s\n" "${LOG_FILE}"
printf "Health check: curl http://127.0.0.1:${TRYON_API_PORT:-8000}/healthz\n"
