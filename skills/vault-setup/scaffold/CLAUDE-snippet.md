## Vault

The vault at `{{HOME}}/agent-vault/vault` is shared storage between the user and agents. It holds handoffs, research, references, and anything else either side wants the other to have.

- Read `CLAUDE.md` at the vault root before writing anything there.
- To find something, read `index.md`, then grep `summary:` lines. Don't read whole folders.
- Read research docs only when the task names the topic or the user asks.
- If the directory is missing or read-only, say so. Don't write the doc elsewhere.
- `scratch/` is the catch-all: anything that doesn't fit elsewhere goes there — one-off output (HTML reports, scripts, screenshots), drafts not tied to a repo, or anything else without an obvious category. Don't hold a file back for want of a better category.