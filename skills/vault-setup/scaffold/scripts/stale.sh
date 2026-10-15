#!/usr/bin/env bash
# Expire research docs older than 7 days (by the `researched:` front matter date) and
# specs older than 30 days (by the `updated:` front matter date).
# Dry run unless --delete is passed. Also reports old scratch/handoff files; never deletes those.
# Run snapshot.sh before and after --delete.
set -euo pipefail

delete=false
[ "${1:-}" = "--delete" ] && delete=true

root="$(cd "$(dirname "$0")/.." && pwd)"
vault="$root/vault"

# expire <label> <folder> <front matter field> <max days>
expire() {
  local label="$1" folder="$2" field="$3" max_days="$4" cutoff expired=0 undated=0 f d
  if date -d "1 day ago" +%F >/dev/null 2>&1; then
    cutoff="$(date -d "$max_days days ago" +%F)"
  else
    cutoff="$(date -v-"$max_days"d +%F)"
  fi
  while IFS= read -r -d '' f; do
    d="$(sed -n "1,/^---\$/{s/^$field:[[:space:]]*//p;}" "$f" | head -1 | tr -d '"'"'"'[:space:]')"
    if [[ ! "$d" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
      echo "undated (not deleted): ${f#"$root"/}"
      undated=$((undated + 1))
      continue
    fi
    if [[ "$d" < "$cutoff" ]]; then
      if $delete; then
        rm -- "$f"
        echo "deleted: ${f#"$root"/} ($field $d)"
      else
        echo "would delete: ${f#"$root"/} ($field $d)"
      fi
      expired=$((expired + 1))
    fi
  done < <(find "$vault"/projects -path "*/$folder/*" -name '*.md' -type f -print0)
  echo "$label: $expired expired, $undated undated (cutoff $cutoff)"
}

expire research research researched 7
expire specs specs updated 30

echo "oldest files outside research and specs (never deleted automatically):"
find "$vault/scratch" "$vault"/projects -type f -name '*.md' ! -path '*/research/*' ! -path '*/specs/*' -exec ls -lt {} + 2>/dev/null | tail -5 || true
