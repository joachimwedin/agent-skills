# agent-vault

Shared knowledge base for me and coding agents. Only `vault/` is mounted into sandboxes (`sbx create claude <workspace> ~/agent-vault/vault`), so agents never see `.git` or `scripts/`. History and backups are host-side only.

- `vault/` — the documents. Rules for writing there are in `vault/CLAUDE.md`.
- `scripts/snapshot.sh` — commits all changes under `vault/` with a timestamp.
- `scripts/stale.sh` — deletes expired research (older than 7 days), and reports old scratch/handoff files. Dry run unless `--delete` is passed.
- `scripts/daily.sh` — snapshot, `stale.sh --delete`, snapshot. Run it from the host.
- `CLAUDE-snippet.md` — the pointer to paste into `~/.claude/CLAUDE.md`.
