---
name: docs-setup
description: Set up the docs knowledge base on this machine — git repo, vault, scripts. Runs once per machine.
disable-model-invocation: true
---

# Docs Setup

Creates `~/docs`: a git repo whose `vault/` folder is the only part mounted into sandboxes. Git history and the scripts stay on the host. This skill's `scaffold/` folder holds the files to copy.

## 1. Check for an existing directory

If `~/docs` exists, tell the user it's already set up and stop.

## 2. Create the repo

Ask whether the user has a remote for their docs repo.

- **Remote:** `git clone <url> ~/docs`.
- **No remote:** `mkdir -p ~/docs`, copy `scaffold/` into it with dotfiles (`cp -R scaffold/. ~/docs/`), then `git -C ~/docs init -b main` and commit as `initial scaffold`.

Run `chmod +x ~/docs/scripts/*.sh`. Done when `~/docs/vault/CLAUDE.md` exists.

## 3. Add the pointer to the global CLAUDE.md

Show `~/docs/CLAUDE-snippet.md` with `{{HOME}}` replaced by the user's home directory. Ask whether to append it to `~/.claude/CLAUDE.md`. If that file already has a `## Knowledge base` section, say so and skip. The `## Sandbox` part matters only on machines that run sandboxes. Done when it is appended or declined.

## 4. Hand off

Tell the user the vault is ready, and give the mount command for a sandbox:

```bash
sbx create claude <workspace> ~/docs/vault
```

Add that `scripts/daily.sh` snapshots and expires research, and runs only when the user runs it. `scripts/stale.sh` without arguments is a dry run of the expiry, and `git -C ~/docs log` holds the history agents never see.
