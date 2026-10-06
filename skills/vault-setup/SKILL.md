---
name: vault-setup
description: Set up the vault knowledge base on this machine — git repo, vault, scripts. Runs once per machine.
disable-model-invocation: true
---

# Vault Setup

Creates `~/agent-vault`: a git repo whose `vault/` folder is the only part mounted into sandboxes. Git history and the scripts stay on the host. This skill's `scaffold/` folder holds the files to copy.

## 1. Check for an existing directory

If `~/agent-vault` exists, tell the user it's already set up and stop.

## 2. Create the repo

Ask whether the user has a remote for their vault repo.

- **Remote:** `git clone <url> ~/agent-vault`.
- **No remote:** `mkdir -p ~/agent-vault`, copy `scaffold/` into it with dotfiles (`cp -R scaffold/. ~/agent-vault/`), then `git -C ~/agent-vault init -b main` and commit as `initial scaffold`.

Run `chmod +x ~/agent-vault/scripts/*.sh`. Done when `~/agent-vault/vault/CLAUDE.md` exists.

## 3. Add the pointer to the global CLAUDE.md

Show `~/agent-vault/CLAUDE-snippet.md` with `{{HOME}}` replaced by the user's home directory. Ask whether to append it to `~/.claude/CLAUDE.md`. If that file already has a `## Vault` section, say so and skip. The `## Sandbox` part matters only on machines that run sandboxes. Done when it is appended or declined.

## 4. Hand off

Tell the user the vault is ready, and give the mount command for a sandbox:

```bash
sbx create claude <workspace> ~/agent-vault/vault
```

Add that `scripts/daily.sh` snapshots and expires research, and runs only when the user runs it. `scripts/stale.sh` without arguments is a dry run of the expiry, and `git -C ~/agent-vault log` holds the history agents never see.
