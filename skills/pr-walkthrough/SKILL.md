---
name: pr-walkthrough
description: Narrates a branch's intent in a few sentences, from its commit messages and its diff against the repo's default branch — the Overview-level construct from "Trust-Calibrated Code Review" (LIPIcs.ESEM.2026.89). Use standalone for a quick plain-language summary of a branch, or as `pr-report`'s Overview-level input.
argument-hint: "<branch>"
---

# PR walkthrough

Narrate what a branch does and why, the way a colleague would talk you through it before you start reading code — not a file-by-file list.

Takes exactly one argument: a branch name. Stop and ask for one if it's missing; don't default to the current branch.

## 1. Scope the diff

1. Find the repo's default branch: `git symbolic-ref refs/remotes/origin/HEAD`, stripped of its `refs/remotes/origin/` prefix. Fall back to `main` if that fails.
2. Confirm the named branch exists: `git rev-parse --verify <branch>`. Stop and report if it doesn't.
3. Read the commit list since it diverged, oldest first, with structured fields: `git log <default>..<branch> --reverse --format='%h%x01%an%x01%ad%x01%s' --date=format:'%b %-d'`, splitting each line on the `\x01` byte into `sha`, `author`, `date`, `subject`.
4. Read the full diff: `git diff <default>..<branch>`.

Done when: the commit list and the full diff have both been read.

## 2. Write the walkthrough

2-4 sentences, architectural altitude: what problem the branch solves and how, synthesized from the commit messages and your own read of the diff — never a recitation of which files changed. Name the actual mechanism ("pins the Docker build to linux/amd64," not "updates deploy.sh"). If the branch is a sequence of otherwise-unrelated commits with no single throughline, say that plainly instead of forcing a narrative that isn't there.

Don't fetch a GitHub PR for title/description context — this skill is strictly branch-based, with no network dependency.

## Output

Print the walkthrough directly in the response, under a `## Walkthrough` heading, followed by the commit list as one JSON array, fenced in a ```json block, oldest commit first:

```json
[{ "sha": "...", "author": "...", "date": "...", "subject": "..." }]
```

No file is written.

When invoked as part of `pr-report`, the walkthrough text becomes the Overview level verbatim and the commit list becomes the header's commit timeline — both reused as written, not re-derived.

Done when: the walkthrough is written and the commit list JSON is printed.
