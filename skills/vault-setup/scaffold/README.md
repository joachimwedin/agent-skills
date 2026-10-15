# agent-vault

Shared knowledge base for me and coding agents. History and backups live in git.

- `vault/` — the documents. Rules for writing there are in `vault/CLAUDE.md`.
- `scripts/snapshot.sh` — commits all changes under `vault/` with a timestamp.
- `scripts/stale.sh` — deletes expired research (older than 7 days) and expired specs (not updated in 30 days), and reports old scratch/handoff files. Dry run unless `--delete` is passed.
- `scripts/daily.sh` — snapshot, `stale.sh --delete`, snapshot.
- `CLAUDE-snippet.md` — the pointer to paste into `~/.claude/CLAUDE.md`.
