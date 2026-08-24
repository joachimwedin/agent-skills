---
name: spec-pass
description: Carries one child ticket on a Spec's board to its next terminal state, given an explicit ticket number and mode — `work` (code a child sitting in in-progress/) or `review-child` (resolve a child sitting in review/). Use when spec-loop spawns a subagent for a judgment action, or to work one specific ticket directly.
---

# Spec Pass

Invoked with a ticket number (or path) and a mode: `work` or
`review-child`. Never scans a Spec's board or decides what's next
itself, in any context — the caller (`spec-loop`, or a person invoking
this directly) always names the exact ticket and mode. Claiming a
pickable child, and moving a Spec whose children are all `done/` to
`review/`, are both purely mechanical and are handled entirely by
`agent-skills/scripts/board-step` before this skill is ever invoked;
this skill only carries an already-claimed child, or a child already
sitting in `review/`, to its terminal state per
[TICKET-FORMAT.md](../agent-tickets/TICKET-FORMAT.md)'s "Spec board
operations".

## Mode: `review-child`

The ticket is a child sitting in `review/`. Resolve it per "Spec board
operations":

1. **Resolve**: fix what's missing or approve outright against its
   `## Acceptance criteria`, ticking each box that now reflects
   reality.
2. **Feedback loops**: if `package.json` defines a `build` script, run
   it; if it defines a `test` script, run that too. Skip whichever
   doesn't exist.
3. **Commit** any fix to the project's own repo, per
   TICKET-FORMAT.md's "Project commits".
4. **Close**: move it to `done/`, commit.

## Mode: `work`

The ticket is a child sitting in `in-progress/`. Carry it all the way
to a terminal state in this same pass:

1. **Explore**: use the Explore agent to locate the relevant code —
   specific file paths and line numbers, not full contents, including
   any existing tests in the area. Read only those files/ranges
   yourself before implementing.
2. **Implement**: use `/tdd`, satisfying every `## Acceptance criteria`
   item, ticking each box in the ticket file as you satisfy it.
3. **Feedback loops**: if `package.json` defines a `build` script, run
   it; if it defines a `test` script, run that too. Skip whichever
   doesn't exist.
4. **Commit** to the project's own repo, per TICKET-FORMAT.md's
   "Project commits".
5. **Decide its fate**:
   - Every `## Acceptance criteria` box checked — move it to `review/`,
     commit.
   - Can't finish for reasons outside your control (e.g. a sandbox
     blocks a genuinely required command) — append `## Flagged` per
     TICKET-FORMAT.md's "Flagged tickets", move back to `todo/`,
     commit.
