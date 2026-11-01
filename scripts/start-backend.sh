#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -f "$project_root/.env" ]]; then
  set -a
  source "$project_root/.env"
  set +a
else
  echo "No .env found; using application.yml defaults. Google, Gemini and SE Pay require environment variables." >&2
fi
cd "$project_root/backend"
exec mvn spring-boot:run
