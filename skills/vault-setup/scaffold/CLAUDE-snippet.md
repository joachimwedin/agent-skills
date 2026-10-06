## Sandbox

You run inside a Docker sandbox (`sbx`), not directly on the user's machine.

- Only the workspaces mounted at creation are visible, at the same paths as on the host. Some may be read-only.
- Your home is `/home/agent`, not the user's `{{HOME}}`. `~` resolves to the sandbox home, so use absolute paths for anything on the host. `~/.claude/` here is the sandbox's own copy, separate from the user's.
- Outbound network goes through a filtering proxy. A blocked request returns HTTP 403 with the reason in the body. Read it before retrying.
- You can't change sandbox settings (network policy, secrets, mounts) from inside. Tell the user which `sbx` command to run on the host.

## Vault

The vault at `{{HOME}}/agent-vault/vault` is shared storage between the user and agents. It holds handoffs, research, references, and anything else either side wants the other to have.

- Read `CLAUDE.md` at the vault root before writing anything there.
- To find something, read `index.md`, then grep `summary:` lines. Don't read whole folders.
- Read research docs only when the task names the topic or the user asks.
- If the directory is missing or read-only, say so. Don't write the doc elsewhere.
- `scratch/` is the catch-all: anything that doesn't fit elsewhere goes there — one-off output (HTML reports, scripts, screenshots), drafts not tied to a repo, or anything else without an obvious category. Don't hold a file back for want of a better category.