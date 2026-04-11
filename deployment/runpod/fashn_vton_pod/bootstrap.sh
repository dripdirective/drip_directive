#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="${WORKSPACE_DIR:-/workspace}"
FASHN_REPO_DIR="${FASHN_REPO_DIR:-${WORKSPACE_DIR}/fashn-vton-1.5}"
FASHN_WEIGHTS_DIR="${FASHN_WEIGHTS_DIR:-${WORKSPACE_DIR}/fashn-vton-weights}"

export DEBIAN_FRONTEND=noninteractive

if command -v apt-get >/dev/null 2>&1; then
  apt-get update
  apt-get install -y --no-install-recommends git libgl1 libglib2.0-0
  rm -rf /var/lib/apt/lists/*
fi

python -m pip install --upgrade pip setuptools wheel
python -m pip install -r "${SCRIPT_DIR}/requirements.txt"

if [ ! -d "${FASHN_REPO_DIR}/.git" ]; then
  git clone --depth 1 https://github.com/fashn-AI/fashn-vton-1.5.git "${FASHN_REPO_DIR}"
fi

python -m pip install -e "${FASHN_REPO_DIR}"

mkdir -p "${FASHN_WEIGHTS_DIR}"
if [ -z "$(find "${FASHN_WEIGHTS_DIR}" -mindepth 1 -print -quit 2>/dev/null)" ]; then
  python "${FASHN_REPO_DIR}/scripts/download_weights.py" --weights-dir "${FASHN_WEIGHTS_DIR}"
fi

printf "\nBootstrap complete.\n"
printf "FASHN repo: %s\n" "${FASHN_REPO_DIR}"
printf "Weights dir: %s\n" "${FASHN_WEIGHTS_DIR}"
printf "Next step: bash %s/launch_api.sh\n" "${SCRIPT_DIR}"
