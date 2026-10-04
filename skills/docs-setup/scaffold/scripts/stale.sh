#!/usr/bin/env bash
# Expire research docs older than MAX_DAYS (by the `researched:` front matter date).
# Dry run unless --delete is passed. Also reports old scratch/handoff files; never deletes those.
# Run snapshot.sh before and after --delete.
set -euo pipefail

MAX_DAYS=7
delete=false
[ "${1:-}" = "--delete" ] && delete=true

root="$(cd "$(dirname "$0")/.." && pwd)"
vault="$root/vault"

if date -d "1 day ago" +%F >/dev/null 2>&1; then
  cutoff="$(date -d "$MAX_DAYS days ago" +%F)"
else
  cutoff="$(date -v-"$MAX_DAYS"d +%F)"
fi

expired=0
undated=0
while IFS= read -r -d '' f; do
  d="$(sed -n '1,/^---$/{s/^researched:[[:space:]]*//p;}' "$f" | head -1 | tr -d '"'"'"'[:space:]')"
  if [[ ! "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    echo "undated (not deleted): ${f#"$root"/}"
    undated=$((undated + 1))
    continue
  fi
  if [[ "$d" < "$cutoff" ]]; then
    if $delete; then
      rm -- "$f"
      echo "deleted: ${f#"$root"/} (researched $d)"
    else
      echo "would delete: ${f#"$root"/} (researched $d)"
    fi
    expired=$((expired + 1))
  fi
done < <(find "$vault"/projects -path '*/research/*' -name '*.md' -type f -print0)

echo "research: $expired expired, $undated undated (cutoff $cutoff)"

echo "oldest files outside research (never deleted automatically):"
find "$vault/scratch" "$vault"/projects -type f -name '*.md' ! -path '*/research/*' -exec ls -lt {} + 2>/dev/null | tail -5 || true
