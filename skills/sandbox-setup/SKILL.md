---
name: sandbox-setup
description: Set up a Claude Code sandbox for a group of related repos — creates the shared context repo, wires up the CLAUDE.md pointer, and generates the shell function that launches the sandbox.
disable-model-invocation: true
---

# Sandbox Setup

Set up a named sandbox: a grouping of related repos, plus a dedicated context repo maintained by `/system-mapping`. Runs once per sandbox.

## 1. Explain what's about to happen

Print the summary above to the user, adapted into a short greeting, before asking anything.

## 2. Gather inputs

List every folder under `~/repos` that contains a `.git` directory as a numbered list, and ask the user which to include as **member repos** — by number or by name, whichever they prefer. Ask this as plain chat text: the list, then a free-text question. Do not use `AskUserQuestion` or any fixed-option tool here — the answer is an arbitrary subset of an arbitrary-length list, which doesn't fit a small set of mutually-exclusive options.

## 3. Analyze member repos

For each member repo, spawn a subagent (Agent tool, one per repo, run in parallel) to analyze it. Give each subagent the repo's absolute path and the full list of its sibling repos (name and path) — it has no memory of this conversation and can't know what "sandbox siblings" means otherwise. Have it read the repo's README and manifest, scan its source, and grep for imports or references to its siblings, then report back the repo's purpose and its real dependencies, with why.

Hold these findings — nothing gets written yet; the context repo doesn't exist until step 6.

## 4. Flag undiscovered dependencies

Collect the dependencies the analysis named that resolve to a git-repo folder under `~/repos` but weren't selected as a member. Dedupe across repos.

If any remain, list them and ask the user which to add, same as step 2.

For each repo the user adds: spawn a subagent for it too (same briefing as step 3 — full path, full current sibling list including anything else added in this step) and hold its findings alongside the rest. One pass: if its own analysis turns up yet another unselected dependency, resolve it under this same step rather than starting a new round.

For each the user declines: drop that dependency from the held findings — it won't be written. `system-mapping`'s `## Depends on` section is scoped to sandbox siblings only, so a declined repo has no place there.

## 5. Suggest a name

Suggest at least 3 candidate names for the sandbox, each in the form `<label>-agent-context` — this is the full name, used directly as both the `sbx` sandbox name and the context repo's folder name, nothing appended later. Derive `<label>` from the repo names and terms the analysis actually surfaced (e.g. a product or domain name a README names) — not an invented or metaphorical word. List them as a numbered list and let the user pick one, or supply their own, before creating anything — same presentation as step 2: plain chat text, no `AskUserQuestion`.

Once the full name is chosen, suggest at least 3 candidates for a short **alias** — the command the user actually types to launch the sandbox, kept separate from the full name above. Derive these mechanically, e.g. the label with `-agent-context` trimmed, the first selected repo's name alone, or an initialism of the member repos. List them the same way and let the user pick one or supply their own.

## 6. Create the context repo

`git init` at `~/repos/<sandbox-name>`, then commit a `CLAUDE.md` with one context pointer per member repo — the initial selection plus anything added in step 4 (format in [system-mapping's REPO-FORMAT.md](../system-mapping/REPO-FORMAT.md)) — and write each of those repos' `.md` file from its held findings, in system-mapping's format.

Also commit `pointer.md` at the context repo's root — a one-line stub, not a copy of `CLAUDE.md`:

```md
# <sandbox-name>

Context for these repos lives in [<sandbox-name>/CLAUDE.md](./<sandbox-name>/CLAUDE.md) — see it for the full repo list.
```

This is what gets copied into the sandbox in step 7. `CLAUDE.md`'s own repo-pointer links (`./{repo}.md`) only resolve correctly when read from inside the context repo itself — copying `CLAUDE.md` verbatim into the shared parent directory the sandbox opens in would break every one of those links.

## 7. Generate the launch function

Write a bash function to `sandbox-launch.sh` inside the context repo, named after the alias from step 5. The `paths` array needs one entry per current member repo — the initial selection plus anything added in step 4 — not just the two shown here:

```bash
<alias>() {
  local name="<sandbox-name>"
  local paths=(
    "$HOME/repos/<sandbox-name>"
    <repo-1-path>
    <repo-2-path>
  )

  sbx skills import --force

  if ! sbx ls -q | grep -qx "$name"; then
    sbx create --name "$name" claude "${paths[@]}"
    sbx cp ~/.claude/settings.json "$name":/home/agent/.claude/settings.json
    sbx cp ~/.claude/statusline-command.sh "$name":/home/agent/.claude/statusline-command.sh
    sbx cp "$HOME/repos/<sandbox-name>/pointer.md" "$name":$HOME/repos/CLAUDE.md
  fi

  sbx run --name "$name"
}
```

`sbx skills import` runs on the host, not inside a named sandbox — it syncs `~/.claude/skills` (following top-level symlinks) into the persistent store every sandbox shares. It runs on every launch, not just first creation, so skill edits are picked up next time you attach.

## 8. Hand off

Print the one line the user adds to their own shell rc to make the function available — `source ~/repos/<sandbox-name>/sandbox-launch.sh` — and that running `<alias>` afterward launches the sandbox. Do not edit the user's shell configuration.
