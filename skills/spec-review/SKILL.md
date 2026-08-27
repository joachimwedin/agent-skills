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

Report the fate, per TICKET-FORMAT.md's "Report fate" — do not move the
Spec's file into `agent-tickets` yourself; the caller (`spec-loop`, or
a person running this skill directly) performs the move to enact
whichever fate you report:

- Filed any new child tickets — report `flagged`, with the reason
  naming what was filed. Its board still has more work to do; the
  caller moves the Spec from `review/` back to `in-progress/` on your
  behalf (no `## Flagged` section is appended to the Spec itself).
- Otherwise — fixed things directly with no new tickets filed, or found
  nothing to flag — report `done`. The caller moves the Spec from
  `review/` to `done/` on your behalf.
