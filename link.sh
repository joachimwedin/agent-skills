#!/bin/bash
set -euo pipefail

repo="$(cd "$(dirname "$0")" && pwd)"
skills_dir=~/.claude/skills
manifest="$repo/.linked"
BOLD=$'\033[1m'; DIM=$'\033[2m'; GRAY=$'\033[90m'; LIGHT_GRAY=$'\033[38;5;250m'; YELLOW=$'\033[38;5;179m'; GREEN=$'\033[38;5;114m'; RED=$'\033[38;5;210m'; RESET=$'\033[0m'

repo_display="${repo/#$HOME/~}"
skills_display="${skills_dir/#$HOME/~}"

previous="$(cat "$manifest" 2>/dev/null || true)"

stow -d "$repo" -t "$skills_dir" -R skills

echo
echo "${DIM}linking into ${skills_display}${RESET}"

new=0
unchanged=0
: > "$manifest"
for d in "$repo"/skills/*/; do
  name="$(basename "$d")"
  echo "$name" >> "$manifest"
  if grep -qxF "$name" <<< "$previous"; then
    unchanged=$((unchanged + 1))
  else
    echo "  ${GREEN}+ linked${RESET} ${BOLD}$name${RESET}"
    new=$((new + 1))
  fi
done

removed=0
orphaned=0
for name in $previous; do
  if [ ! -d "$repo/skills/$name" ]; then
    orphaned=$((orphaned + 1))
    echo
    echo "  ${YELLOW}! orphaned${RESET} ${BOLD}${name}${RESET}"
    printf "    ${DIM}%-18s${RESET}%s\n" "source gone from" "$repo_display/skills/"
    printf "    ${DIM}%-18s${RESET}%s\n" "link" "$skills_display/$name"
    read -p "    Remove the link? ${GRAY}[y/N]${RESET} " reply
    if [[ "$reply" == [yY] ]]; then
      rm -f "$skills_dir/$name"
      echo "  ${RED}- removed${RESET} ${BOLD}$name${RESET}"
      removed=$((removed + 1))
    fi
  fi
done

if [ "$unchanged" -gt 0 ]; then
  if [ "$new" -gt 0 ] || [ "$orphaned" -gt 0 ]; then
    echo
  fi
  echo "    ${DIM}${unchanged} unchanged${RESET}"
fi

echo
if [ "$removed" -gt 0 ]; then
  echo "${LIGHT_GRAY}$((new + unchanged)) skills linked, ${removed} removed.${RESET}"
else
  echo "${LIGHT_GRAY}$((new + unchanged)) skills linked.${RESET}"
fi
