---
name: run-spec
description: Drives a Spec's board on agent-tickets to completion, dispatching spec-pass/spec-review subagents concurrently for every workable child and landing each as it finishes.
disable-model-invocation: true
---

# Run Spec

Invoked with a Spec (number or path). Drives
`agent-skills/scripts/board-step` against that Spec's board — it
decides and, whenever the next action is purely mechanical, performs it
directly, returning the board's current state alongside its verdict.
Whenever the next action needs judgment, a `spec-pass` or `spec-review`
subagent is spawned for every currently-workable child at once, each
in its own isolated project-repo worktree and branch, until nothing's
left to progress and nothing remains in flight.
`agent-skills/scripts/board-state` is `board-step`'s read-only
counterpart, called once up front to render the board's opening
snapshot. `agent-skills/scripts/land-child` is the third tool this
skill drives — see "Landing" below.

## No Spec given

If invoked with no Spec, resolve one yourself before doing anything
else — this resolution is a read, not a change, so it doesn't conflict
with "The driving agent only drives" below:

1. List every project subfolder under `~/repos/agent-tickets/boards/`,
   unfiltered — including ones with no open Specs. Always ask the user
   to pick one; never auto-skip this step, even if only one project
   happens to have an open Spec.
2. Within the chosen project, list every Spec file
   (`<n>-spec-<slug>.md`) not currently sitting in `done/`, excluding
   any with a `Type: wayfinder-map` line — run-spec has no defined
   behavior for a wayfinder map.
   - **Zero** matches — report "no open Specs in `<project>`" and end
     the turn, without looping back to let the user pick a different
     project.
   - **Exactly one** — state which one and why, and ask the user to
     confirm before proceeding. On "no", end the turn, without looping
     back to project selection.
   - **More than one** — ask the user to pick.

   Either way, nothing here loops back to an earlier choice —
   re-invoking `/run-spec` is cheap, so the user just runs it again.
3. Treat the resolved Spec exactly as if it had been given as the
   argument from the start, and continue below.

## Project repo and base branch

Every child's work happens in the *project's* own repo, never in
`agent-tickets` itself (see "No locking, single-writer" below). Resolve
both of these once, before anything else happens, and hold them for
the whole run:

- **Project repo directory**: `~/repos/<project>`, where `<project>` is
  the board directory's own basename (`~/repos/agent-tickets/boards/
  <project>/` ↔ `~/repos/<project>/`) — the same convention
  TICKET-FORMAT.md's path shapes already use. If no such directory
  exists, or it isn't a git repository, that's a `blocked` outcome (see
  "Blocked" below) — report it and stop; don't guess at a different
  path.
- **Base branch**: this Spec's own dedicated branch in that repo,
  `spec-<n>-<slug>` (the Spec ticket's own number and slug) — every
  child worktree branches off it, and every landed child merges back
  onto it, so later-finishing siblings build on top of already-landed
  work. If the branch already exists (resuming a Spec that was already
  in progress), check it out as-is; otherwise create it off the
  project's current default branch and check it out:

  ```
  git -C <project-repo-dir> checkout <spec-branch>
  # or, first time:
  git -C <project-repo-dir> checkout -b <spec-branch> <default-branch>
  ```

  This is what `spec-review` later reviews as "every commit unique to
  this branch since it diverged from `main`" — resolving/creating it is
  mechanical (no judgment), so it's a `The driving agent only drives`
  exception the same way running `board-step` is.

## The driving agent only drives

You (the agent running this skill) make only these mechanical changes
yourself, at any point during this run — each deterministic by
construction, no judgment involved — and nothing else:

- Running `board-step` itself — both its decide-and-act form and its
  `report` form (enacting a fate a subagent already decided and
  reported back — see "Run" below).
- Resolving/creating the Spec's base branch (see "Project repo and
  base branch" above).
- Creating and removing a child's worktree/branch, and landing a
  finished child via `land-child` (see "Landing" below) — merging its
  branch onto the base and, on a clean result, enacting its already-
  decided fate is mechanical the same way `board-step report` always
  was; extending "driving agent only drives" to cover landing is this
  skill's own change (see the parent Spec's "the driving agent only
  drives still holds, extended to cover landing" decision).

Everything else is: spawning subagents, narrating their reports and the
tools' own output, printing board snapshots, and — once the run ends —
stating the final outcome. Every judgment-driven change — to the
tracker, the project repo, a single file, ticket move, or commit —
happens inside a spawned subagent's own `spec-pass` or `spec-review`
invocation, never in this conversation directly — that subagent reports
the fate it decided rather than moving or committing anything itself
(TICKET-FORMAT.md's "Report fate"). If you notice something that seems
to need fixing (a miswritten ticket, a premature `## Flagged` section,
a missing file), say what you noticed when you report the outcome and
let the user decide, rather than fixing it yourself.

## No locking, single-writer

Safety comes from two invariants this skill must never violate:

- This conversation's own orchestrating process is the *only* thing
  that ever writes into the shared `agent-tickets` checkout (whether
  the transition is mechanical or a reported fate being enacted), and
  the *only* thing that ever merges a child's branch onto the Spec's
  base branch in the shared project-repo checkout.
- Every genuinely concurrent write — a `spec-pass` subagent's own
  coding — happens inside that child's own isolated worktree, which no
  other subagent or process ever touches.

## Board snapshot

Rendered from board JSON, never a freehand scan of the kanban folders.
Before anything else happens, call `board-state` once (see "Run" below)
to get that JSON. After that, render directly from the `board` field
the same `board-step` call just returned — no separate re-scan step
after acting.

Either tool's JSON has the same shape for this purpose: a `spec`
ticket and a `children` array, each ticket carrying `number`, `slug`,
`folder` (whichever of the four kanban folders it's currently in),
`blockedBy` (ticket numbers it's still waiting on), and `flagged`
(whether it carries a `## Flagged` section) — read these fields
directly; do not re-derive them by reading ticket files yourself. This
same `children` array, filtered by `folder`, is also how "Run" below
determines exactly which children to dispatch concurrently each round —
reading it for that purpose is still mechanical, not a judgment call:
it never overrides what `board-step` itself decided, it only enumerates
the full set behind the single example ticket `board-step`'s `dispatch`
outcome names (see "Run" below).

- For every child with `folder: "todo"`, check its `blockedBy` numbers
  against the `folder` of those tickets in the same JSON, and note any
  still outstanding.
- `flagged: true` marks a ticket flagged directly — no need to inspect
  ticket text for a `## Flagged` section.
- Diff this JSON against the immediately preceding snapshot's JSON to
  find every ticket whose `folder` just changed — those are the rows to
  bold. Usually just one, but a single call can change several: a claim
  on a Spec's first child also moves the Spec's own row (`todo` →
  `in-progress`, per TICKET-FORMAT.md's "Claim"), and a call that claims
  several simultaneously-pickable children at once moves every one of
  their rows too — bold all of them. Skip the diff on the very first
  snapshot (from `board-state`, before anything else has run yet);
  nothing's changed yet, so nothing is bolded.
- Alongside the table, list every ticket currently tracked as **in
  flight** (see "Run" below) that this same snapshot doesn't already
  show landed — a board's `folder` alone can't distinguish "claimed but
  no subagent running yet" from "a subagent is actively working it," so
  this list is what actually shows concurrency happening.

Render every snapshot the same way, narration line first:

```
<narration line, e.g. Claimed children #5 and #12, moved them to in-progress/. Dispatched #5 and #12 concurrently.>

**Spec #<n> board — <slug>**

| # | Ticket | State |
|---|--------|-------|
| 1 | spec | 🔳 todo |
| 2 | ... | ✅ done |

In flight: #5 (work), #12 (work)
```

- State column icons, keyed off `folder` (`flagged: true` overrides
  the folder icon): ✅ done · 🟦 review · 🟨 in-progress · 🔳 todo · 🚫
  flagged.
- Append a note to the State cell when relevant — a blocked `todo`
  ticket gets "🔳 todo (needs #5)"; a flagged one gets "🚫 flagged"; a
  standing failure (see [RECOVERY.md](./RECOVERY.md)'s "Failure
  handling") gets "⛔ failed twice".
- Bold all three cells of every row that just changed `folder`.
- Omit the "In flight" line entirely once nothing's in flight.

## Run

Four rules govern dispatch, named rather than numbered because none of
them run in sequence: each fires the instant its trigger condition
holds, more than one can fire in the same beat, and none of them wait
their turn on any other. Together they dispatch every currently-
workable child at once, land each as it reports back, and keep firing
until the board can't be progressed any further.

Before doing anything else, resolve the project repo and base branch
(see above), then call `board-state` once and print its board as the
starting snapshot (see "Board snapshot" above) — the board's starting
point, nothing bolded yet, nothing in flight yet:

```
board-state <spec-number> <board-dir>
board-state <path-to-spec-ticket-file>
```

Hold two pieces of state for the rest of this run (in this conversation
only — nothing written to disk represents them):

- **In flight**: every child ticket that currently has a `spec-pass`
  subagent dispatched and not yet landed or given up on, each carrying
  its worktree path, branch name, dispatched mode (`work` or
  `review-child`), and its landing `attempt` counter (see "Landing"
  below).
- **Standing failures**: every child ticket excluded from further
  automatic dispatch this run after two consecutive subagent crashes
  (see RECOVERY.md's "Failure handling").

`board-step` is the sole source of truth for every *mechanical* action
(claiming, Spec-ready) and for the run's own terminal/hard-barrier
outcomes (`done`, `blocked`, `dispatch-spec-review`) — never decide any
of those yourself, only narrate what it reports. If `board-step` or
`board-state` itself errors out with no report at all, see RECOVERY.md's
"Consecutive-failure circuit breaker".

- **Startup** — run `board-step` for the first time this run:

   ```
   board-step <spec-number> <board-dir>
   board-step <path-to-spec-ticket-file>
   ```

   For every child with `folder: "todo"` and no outstanding
   `blockedBy`, it claims it — a `{ "kind": "claimed", "claims": [...]
   }` result narrated as "Claimed child(ren) #<n>[, #<m>, ...], moved
   them to in-progress/."; otherwise, if nothing needed claiming but a
   child still needs dispatching, it reports `{ "kind": "dispatch",
   ... }`, naming just one example ticket. Either way, dispatch a
   subagent for every child this same call's fresh `board` field now
   shows with `folder: "in-progress"` or `folder: "review"` — every one
   just claimed above, plus any already sitting there from before this
   run began (resuming an interrupted run) — all at once:
   - If a child doesn't already have a worktree/branch recorded from
     earlier this run, create one off the current base branch:

     ```
     git -C <project-repo-dir> worktree add -b spec-<n>-<ticket>-<slug> <project-repo-dir>/.worktrees/spec-<n>-<ticket>-<slug> <spec-branch>
     ```
   - Spawn its `spec-pass` subagent (Agent tool), told exactly the
     ticket number (or path), the mode (`work` for `in-progress`,
     `review-child` for `review`), and the worktree path to work in —
     it has no memory of this conversation. Add it to **in flight**.

   Dispatch every child found this way in the same beat — send every
   one of this batch's Agent tool calls together, per the Agent tool's
   own guidance for launching several agents in parallel.

- **On a ticket landing** — as each in-flight subagent reports back (a
   fate, not a crash — see RECOVERY.md's "Failure handling" for a
   crash), handle it immediately, in whatever order reports arrive —
   never collect several before acting on the first:
   - Per TICKET-FORMAT.md's "Report fate", it reports `ready-for-
     review`, `flagged` (with a reason), or `done` rather than moving
     or committing anything itself.
   - Land it via `land-child` (see "Landing" below) rather than calling
     `board-step report` directly — landing is what performs that
     enactment for a child (a Spec's own fate, from `spec-review`, is
     never landed this way; see "Spec review" below).
   - Once landing reaches a terminal result for this child (`landed` or
     `flagged` — never left `needs-resolution`, see "Landing" below),
     remove it from **in flight**. Remove its worktree too, unless it
     just landed with `ready-for-review` (its `review-child` pass will
     reuse the same one):

     ```
     git -C <project-repo-dir> worktree remove <worktree-path>
     ```
   - Narrate both the subagent's work and the resulting move (e.g.
     "Landed #12 onto spec-1-concurrent-spec-pass-dispatch, reported
     ready-for-review — moved it to review/.", "Resolved #9 in review,
     reported done — landed and moved it to done/.").

   This landing changes the board, so run `board-step` again the same
   way Startup does, and re-check its fresh `board` field: a `claimed`
   result narrates the same way as in Startup, and — the same way as
   Startup, worktree creation included — dispatch a fresh subagent for
   every child now sitting in `folder: "in-progress"` (newly unblocked
   because this landing satisfied its `blockedBy`) or `folder:
   "review"` (just moved there by this landing) that isn't already
   tracked **in flight** and isn't a **standing failure**. Every child
   found is dispatched in the same beat — sent together — and never
   waits for any other still-in-flight child to finish first: a child
   found dispatchable because of a later landing is dispatched
   immediately, the moment it's found, exactly the same way.

- **On every child reaching `done/`** — `board-step` reports
   `{ "kind": "spec-ready", ... }`, narrated as "Spec is ready for
   review, moved it to review/." (this can only happen once nothing is
   in flight, since every child must be `done/` first). This is
   followed by `{ "kind": "dispatch-spec-review" }`: spawn a
   `spec-review` subagent for the Spec itself (see "Spec review"
   below). A `spec-review` reporting `flagged` (new children filed) is
   not a separate rule — it is just the Startup and On-a-ticket-landing
   rules above firing again once those new children exist on the
   board.

- **Terminal** — once nothing is left to dispatch and nothing remains
   **in flight**, the run ends. `board-step` reports either
   `{ "kind": "done" }` — the Spec reached `done/` — or
   `{ "kind": "blocked", "reason": "<reason>" }` — say why, naming any
   standing failures (see RECOVERY.md and "Blocked" below for the
   standing-failure rule itself).

After any claim, dispatch, or landing above, render the board snapshot
from the most recent `board-step` call's `board` field, per "Board
snapshot" above, alongside the current **in flight** list — no separate
re-scan step.

## Landing

`agent-skills/scripts/land-child` composes the merge-onto-base attempt
with `board-step`'s fate-enactment entry point in one call, so this
skill never reimplements that policy in prose or performs the merge
itself:

```
land-child <project-repo-dir> <spec-branch> <child-branch> <board-dir> <ticket-number> --fate <fate> [--reason "<why>"] [--attempt <n>]
```

Pass the fate the subagent just reported and, for a retry (see below),
`--attempt` one higher than the previous call for this same ticket
(omit it on a ticket's first landing attempt this run). Act on the
printed JSON's `kind`:

- **`landed`** — the branch merged cleanly and the fate was enacted;
  carries `report` (the same shape as `board-step report`'s own
  result). Terminal for this landing — proceed as in Run's "On a ticket
  landing" rule above.
- **`needs-resolution`** — the branch conflicts with the base as it
  stands right now. See RECOVERY.md's "Landing conflict retries" for
  the retry protocol before calling `land-child` again for this ticket.
- **`flagged`** — inline conflict resolution was abandoned after
  repeated attempts (see RECOVERY.md's "Landing conflict retries" for
  the cap) and the ticket was already recycled to `todo/` with a
  `## Flagged` section, carrying `report` the same way `landed` does.
  Terminal — remove the worktree and stop retrying this ticket this
  run; a future `run-spec` run picks it up fresh (a new claim, a new
  worktree) if it becomes pickable again.

## Spec review

`board-step` only ever returns `{ "kind": "dispatch-spec-review" }`
once the Spec itself sits in `review/`, which per its own Priority scan
only happens once every child is `done/` — by construction, **in
flight** is already empty by then. Confirm it's empty anyway before
dispatching (this run's own bookkeeping, not a second judgment call);
if it somehow isn't, treat this as still having work to finish first
and don't dispatch `spec-review` yet.

Once confirmed, spawn a subagent instructed to run `spec-review` on
this Spec directly (not through `spec-pass` — that skill no longer
handles this case). It likewise reports the Spec's own fate — `flagged`
(filed new child tickets, with a reason naming them) or `done` — rather
than moving or committing the Spec itself. Enact it via `board-step`
directly (a Spec's own fate is never routed through `land-child` — no
child branch is involved):

```
board-step report <spec-number> <board-dir> --fate <fate> [--reason "<why>"]
```

Narrate both the review's outcome and the resulting move (e.g. "ran
spec-review — reopened with 2 new child tickets, moved back to
in-progress/"). There's no cap on how many times a Spec can cycle back
through `spec-review` this way — a reopened Spec's new children flow
through the same concurrent dispatch rules above.

## Blocked

On a `blocked` report — from `board-step` itself, or the standing-
failure case in RECOVERY.md's "Failure handling" — first let every
still-in-flight child finish landing (or crash out to a standing
failure) rather than stopping mid-flight; once nothing remains in
flight, report why and end the turn. Unblocking is the user's call,
made outside this skill: this skill only reports the reason — it never
asks the user how to unblock it, proposes workarounds, or takes any
unblocking action itself (editing a ticket, running a command, touching
the project repo), since that would be a change, and per "The driving
agent only drives" above this skill never makes those. Re-invoke
run-spec once the user has acted.

## Report

Take one final board snapshot and print it, then state the board's
final outcome below it:

- `done` — the Spec reached `done/`.
- `blocked` — say why, per `board-step`'s reported reason, or per any
  standing failures that prevented it from finishing.
- Stopped after a repeated technical failure — say what the error was.

Always name every standing failure from this run in the final report,
even if the Spec otherwise reached `done/` on its remaining children —
a standing failure never blocks siblings from finishing, but it's never
silently dropped either.
