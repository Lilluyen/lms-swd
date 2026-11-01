#!/usr/bin/env bash
# scripts/codegraph-context.sh
# Auto-sync and re-index CodeGraph after a feature split or large refactor.
# Run from the repository root (lms/).

set -euo pipefail

ROOT="${PWD}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== CodeGraph context sync ==="
echo "Root: ${ROOT}"

# 1. Run codegraph sync to refresh the incremental cache
echo "▸ Running codegraph sync..."
if ! codegraph sync --root "${ROOT}" 2>&1; then
  echo "⚠ codegraph sync failed – check the output above."
fi

# 2. Run codegraph status for a quick health view
echo "▸ Running codegraph status --budget small..."
if ! codegraph status --root "${ROOT}" --budget small 2>&1 | head -10; then
  echo "⚠ codegraph status reported issues."
fi

# 3. Show a summary of files changed (if git is available)
echo "▸ Checking for file changes..."
if command -v git >/dev/null 2>&1 && [ -d "${ROOT}/.git" ]; then
  changed="$(git diff --name-only --diff-filter=M 2>/dev/null | wc -l || echo 0)"
  added="$(git diff --name-only --diff-filter=A 2>/dev/null | wc -l || echo 0)"
  echo "  Modified files: ${changed}"
  echo "  Added files:   ${added}"
else
  echo "  (no git repository detected)"
fi

# 4. Orient for the smallest budget so the graph is ready for exploration
echo "▸ Running codegraph orient --budget small..."
if ! codegraph orient --root "${ROOT}" --budget small 2>&1 | head -5; then
  echo "⚠ codegraph orient had issues – the graph may not be fully warmed."
fi

echo "=== Done ==="
echo "Run these manually for deeper inspection:"
echo "  codegraph explore \"course module lesson\" --root ${ROOT}"
echo "  codegraph rdeps path/to/ChangedFile.java --json"
echo "  codegraph hotspots . --limit 20"