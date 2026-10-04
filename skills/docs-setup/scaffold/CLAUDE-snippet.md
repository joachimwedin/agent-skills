## Sandbox

You run inside a Docker sandbox (`sbx`), not directly on the user's machine.

- Only the workspaces mounted at creation are visible, at the same paths as on the host. Some may be read-only.
- Your home is `/home/agent`, not the user's `{{HOME}}`. `~` resolves to the sandbox home, so use absolute paths for anything on the host. `~/.claude/` here is the sandbox's own copy, separate from the user's.
- Outbound network goes through a filtering proxy. A blocked request returns HTTP 403 with the reason in the body. Read it before retrying.
- You can't change sandbox settings (network policy, secrets, mounts) from inside. Tell the user which `sbx` command to run on the host.

## Knowledge base

Docs (handoffs, research, references) live in `{{HOME}}/docs/vault`.

- Before writing there, read `CLAUDE.md` at its root.
- To find something, read `index.md`, then grep `summary:` lines. Don't read whole folders.
- Read research docs only when the task names the topic or the user asks.
- Put anything you can't place in `scratch/`.
- If the directory is missing or read-only, say so. Don't write the doc elsewhere.
- One-off output (HTML reports, scripts, screenshots) stays in `{{HOME}}/sandbox-files/`, not in the vault.
