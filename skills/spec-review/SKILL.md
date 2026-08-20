---
name: spec-review
description: The strict, whole-branch review that closes out a Spec on agent-tickets once every child ticket is done — fix directly, or file new child tickets for anything too large to fix in place, then close or reopen the Spec. Use when spec-pass spawns a subagent because a Spec is sitting in review/.
---

# Spec Review

Runs once a Spec's board shows it sitting in `review/` — `spec-pass`
spawns a fresh subagent to run this pass rather than running it inline
itself (see [TICKET-FORMAT.md](../agent-tickets/TICKET-FORMAT.md)'s
"Spec board operations").

## Gather context

Unlike an ordinary child ticket's review (a single commit or two), this
is the one review of the whole implementation as a unit: read every
commit unique to this branch since it diverged from `main` — the full
log and diff, not just the latest commits — plus the Spec file itself.

## Review

Apply [REVIEW-STANDARDS.md](./REVIEW-STANDARDS.md) in full against that
whole-branch diff.

## Execution

Fix what you can directly, on this branch:

1. If `package.json` defines a `build` script, run it; if it defines a
   `test` script, run that too. Skip whichever doesn't exist.
2. Commit with a message starting `Review -` describing the
   refinements, per TICKET-FORMAT.md's "Project commits".

File anything too large to fix in place as a new child ticket instead,
per [TICKET-FORMAT.md](../agent-tickets/TICKET-FORMAT.md)'s "publish to
the tracker".

## Decide the Spec's fate

- Filed any new child tickets — move the Spec from `review/` back to
  `in-progress/`, commit. Its board still has more work to do.
- Otherwise — fixed things directly with no new tickets filed, or found
  nothing to flag — move the Spec from `review/` to `done/`, commit.
