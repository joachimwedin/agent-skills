#!/usr/bin/env bash
# Commit all changes under vault/ with a timestamp. Host-side only.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

git add -A vault
if git diff --cached --quiet; then
  echo "snapshot: nothing to commit"
  exit 0
fi
git commit -q -m "snapshot $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "snapshot: committed"
