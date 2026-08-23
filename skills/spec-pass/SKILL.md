---
name: spec-pass
description: Progresses a Spec's board on agent-tickets one action at a time — claims and codes the next pickable child, resolves a child sitting in review, moves the Spec to review once its children are done, or runs spec-review once it's already sitting there. Use when spec-loop spawns a subagent to drive a Spec forward, or to work one step of a Spec's board directly.
---

# Spec Pass

Invoked with a Spec (number or path). Scans that Spec's board once and
carries out the single next action per
[TICKET-FORMAT.md](../agent-tickets/TICKET-FORMAT.md)'s "Spec board
operations" — never more than one child ticket per invocation.

## When the action is a child sitting in review

Resolve it per "Spec board operations": fix what's missing or approve
outright against its `## Acceptance criteria`, tick boxes, move it to
`done/`.

## When the action is the Spec itself sitting in review

Spawn a fresh subagent to run `spec-review` on this Spec, and report
its outcome as this pass's outcome.

## When the action is "Spec ready for review"

Move the Spec to `review/`, commit, then stop — a later pass will find
it sitting there and run `spec-review`.

## When the action is a pickable child in `todo/`

If more than one is pickable, work the highest-priority one:

1. Critical bugfixes
2. Development infrastructure — tests, types, dev scripts: an important
   precursor to building features
3. Tracer bullets for new features — a small, complete, end-to-end
   slice, validated before expanding it out
4. Polish and quick wins
5. Refactors

If the Spec itself is still sitting in `todo/`, move it to `in-progress/`
first and commit as `<n>: start — <spec-slug>` — a distinct verb from
`claim`, since it's the child being picked up to work on, not the Spec.
Skip this if the Spec is already `in-progress/` (e.g. a later child claim
on the same board); it's a one-way move that never reverts, even if this
child later gets flagged back to `todo/`.

Then claim the child (move to `in-progress/`, commit), and carry it all
the way to a terminal state in this same pass:

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
   "Project commits" — plus files changed and any blockers or notes for
   whoever picks this board up next.
5. **Decide its fate**:
   - Every `## Acceptance criteria` box checked — move it to `review/`,
     commit.
   - Can't finish for reasons outside your control (e.g. a sandbox
     blocks a genuinely required command) — append `## Flagged` per
     TICKET-FORMAT.md, move back to `todo/`, commit.

## When nothing is actionable

Report the Spec's outcome: `done` (it reached `done/`) or `blocked` —
say why, e.g. the only remaining child is flagged or blocked.
