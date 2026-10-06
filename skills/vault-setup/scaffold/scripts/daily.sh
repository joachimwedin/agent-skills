#!/usr/bin/env bash
# Daily host job: snapshot, expire research, snapshot again.
set -euo pipefail

dir="$(cd "$(dirname "$0")" && pwd)"
"$dir/snapshot.sh"
"$dir/stale.sh" --delete
"$dir/snapshot.sh"
