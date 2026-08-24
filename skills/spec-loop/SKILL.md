---
name: spec-loop
description: Drive a Spec's board on agent-tickets to completion — call the fast-path `board-step` tool every iteration, dispatching a spec-pass or spec-review subagent for every currently-workable child concurrently (never one at a time) whenever the next action needs judgment, landing each as it reports back, until the board can't be progressed any further.
disable-model-invocation: true
---

# Spec Loop

Invoked with a Spec (number or path). Loops
`agent-skills/scripts/board-step` over that Spec's board — it decides
and, whenever the next action is purely mechanical, performs it
directly, returning the board's current state alongside its verdict.
Whenever the next action needs judgment, a `spec-pass` or `spec-review`
subagent is spawned for every currently-workable child at once, each
in its own isolated project-repo worktree and branch — never one at a
time — until nothing's left to progress and nothing remains in flight.
`agent-skills/scripts/board-state` is `board-step`'s read-only
counterpart, called once before the loop starts to render the board's
opening snapshot. `agent-skills/scripts/land-child` is the third tool
this skill drives — see "Landing" below.

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
   any with a `Type: wayfinder-map` line — spec-loop has no defined
   behavior for a wayfinder map.
   - **Zero** matches — report "no open Specs in `<project>`" and end
     the turn. Don't loop back to let the user pick a different
     project; re-invoking `/spec-loop` is cheap.
   - **Exactly one** — state which one and why, and ask the user to
     confirm before proceeding. On "no", end the turn — don't loop back
     to project selection; re-invoking `/spec-loop` is cheap.
   - **More than one** — ask the user to pick.
3. Treat the resolved Spec exactly as if it had been given as the
   argument from the start, and continue below.

## Project repo and base branch

Every child's work happens in the *project's* own repo, never in
`agent-tickets` itself (see "No locking, single-writer" below). Resolve
both of these once, before the first loop iteration, and hold them for
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

You (the agent running this skill) never make any judgment-driven
change yourself — not to the tracker, not to the project repo, not a
single file, ticket move, or commit, at any point in the loop, beyond
these mechanical exceptions, each deterministic by construction — no
judgment involved:

- Running `board-step` itself — both its decide-and-act form and its
  `report` form (enacting a fate a subagent already decided and
  reported back — see "Loop" below).
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
tools' own output, printing board snapshots, and — when the loop ends —
stating the final outcome. Every judgment-driven change happens inside
a spawned subagent's own `spec-pass` or `spec-review` invocation, never
in this conversation directly — that subagent reports the fate it
decided rather than moving or committing anything itself
(TICKET-FORMAT.md's "Report fate"). If you notice something that seems
to need fixing (a miswritten ticket, a premature `## Flagged` section,
a missing file) do not fix it yourself — say what you noticed when you
report the outcome, and let the user decide.

## No locking, single-writer

No file locks or mutexes are ever introduced. Safety instead comes from
two invariants this skill must never violate:

- This conversation's own orchestrating process is the *only* thing
  that ever writes into the shared `agent-tickets` checkout (whether
  the transition is mechanical or a reported fate being enacted), and
  the *only* thing that ever merges a child's branch onto the Spec's
  base branch in the shared project-repo checkout.
- Every genuinely concurrent write — a `spec-pass` subagent's own
  coding — happens inside that child's own isolated worktree, which no
  other subagent or process ever touches.

Never let a spawned subagent write directly into `agent-tickets`, the
project repo's shared checkout, or another child's worktree.

## Board snapshot

Rendered from board JSON, never a freehand scan of the kanban folders.
Before the first loop iteration, call `board-state` once (see "Loop"
below) to get that JSON. On every subsequent iteration, render directly
from the `board` field the same iteration's `board-step` call already
returned — no separate re-scan step after acting.

Either tool's JSON has the same shape for this purpose: a `spec`
ticket and a `children` array, each ticket carrying `number`, `slug`,
`folder` (whichever of the four kanban folders it's currently in),
`blockedBy` (ticket numbers it's still waiting on), and `flagged`
(whether it carries a `## Flagged` section) — read these fields
directly; do not re-derive them by reading ticket files yourself. This
same `children` array, filtered by `folder`, is also how "Loop" below
determines exactly which children to dispatch concurrently each round —
reading it for that purpose is still mechanical, not a judgment call:
it never overrides what `board-step` itself decided, it only enumerates
the full set behind the single example ticket `board-step`'s `dispatch`
outcome names (see "Loop" below).

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
  their rows too — bold all of them. Skip the diff on the very first,
  pre-loop snapshot (from `board-state`); nothing's changed yet, so
  nothing is bolded.
- Alongside the table, list every ticket currently tracked as **in
  flight** (see "Loop" below) that this same snapshot doesn't already
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
  standing failure (see "Failure handling" below) gets "⛔ failed twice".
- Bold all three cells of every row that just changed `folder`.
- Omit the "In flight" line entirely once nothing's in flight.

## Loop

Before doing anything else, resolve the project repo and base branch
(see above), then call `board-state` once and print its board as the
starting snapshot (see "Board snapshot" above) — the board's starting
point, nothing bolded yet, nothing in flight yet:

```
board-state <spec-number> <board-dir>
board-state <path-to-spec-ticket-file>
```

Hold two pieces of state across every iteration for the rest of this
run (in this conversation only — nothing written to disk represents
them):

- **In flight**: every child ticket currently has a `spec-pass`
  subagent dispatched and not yet landed or given up on, each carrying
  its worktree path, branch name, dispatched mode (`work` or
  `review-child`), and its landing `attempt` counter (see "Landing"
  below).
- **Standing failures**: every child ticket excluded from further
  automatic dispatch this run after two consecutive subagent crashes
  (see "Failure handling" below).

Each iteration:

1. Run `board-step` against this Spec, in the same two invocation forms
   as `board-state` above:

   ```
   board-step <spec-number> <board-dir>
   board-step <path-to-spec-ticket-file>
   ```

   It's still the sole source of truth for every *mechanical* action
   (claiming, Spec-ready) and for the loop's own terminal/hard-barrier
   outcomes (`done`, `blocked`, `dispatch-spec-review`) — never decide
   any of those yourself. Narrate its outcome directly:
   - `{ "kind": "claimed", "claims": [...] }` — "Claimed child(ren)
     #<n>[, #<m>, ...], moved them to in-progress/."
   - `{ "kind": "spec-ready", ... }` — "Spec is ready for review, moved
     it to review/." (this can only happen once nothing is in flight —
     see "Dispatch, concurrently" below.)
   - `{ "kind": "dispatch", ... }` — at least one child needs a
     judgment pass; the exact set to dispatch is derived below, not
     from this single ticket number.
   - `{ "kind": "dispatch-spec-review" }`, `{ "kind": "done" }`, or
     `{ "kind": "blocked", "reason": "<reason>" }` — see "Spec review",
     "Blocked", and "Report" below.
2. **Dispatch, concurrently**: from this same call's fresh `board`
   field, find every child with `folder: "in-progress"` or
   `folder: "review"` that isn't already tracked **in flight** and
   isn't a **standing failure**. For each one found:
   - If it doesn't already have a worktree/branch recorded from earlier
     this run (a child moving from its `work` pass into a later
     `review-child` pass keeps the same one), create one off the
     current base branch:

     ```
     git -C <project-repo-dir> worktree add -b spec-<n>-<ticket>-<slug> <project-repo-dir>/.worktrees/spec-<n>-<ticket>-<slug> <spec-branch>
     ```
   - Spawn its `spec-pass` subagent (Agent tool), told exactly the
     ticket number (or path), the mode (`work` for `in-progress`,
     `review-child` for `review`), and the worktree path to work in —
     it has no memory of this conversation. Add it to **in flight**.

   Dispatch every child found this way in the same beat — send every
   one of this round's Agent tool calls together (per the Agent tool's
   own guidance for launching several agents in parallel), not one at a
   time. Do not wait for any of them, or for any other still-in-flight
   child, to finish before continuing — a newly-claimed or newly-
   unblocked child found on a *later* iteration is dispatched
   immediately, the moment it's found, exactly the same way; it never
   waits for today's in-flight batch to drain first.
3. **Land what's finished**: as each in-flight subagent reports back
   (a fate, not a crash — see "Failure handling" below for a crash),
   handle it immediately, in whatever order reports arrive — never
   collect several before acting on the first:
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
4. Render the board snapshot from the most recent `board-step` call's
   `board` field, per "Board snapshot" above, alongside the current
   **in flight** list — no separate re-scan step.
5. Unless this iteration's `board-step` outcome was `done` or
   `blocked` (with nothing in flight — see "Blocked" below), repeat
   from 1.

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
  result). Terminal for this landing — proceed as in "Loop" step 3
  above.
- **`needs-resolution`** — the branch conflicts with the base as it
  stands right now; carries `diff` (what didn't apply) and `attempt`
  (this call's own 1-indexed try). Spawn a fresh conflict-resolution
  `spec-pass` **`work`** subagent on the *same* worktree/branch — still
  tracked **in flight** under this same ticket, not a new entry — handed
  `diff` and told to resolve it against the base and commit. Once that
  subagent reports back, call `land-child` again for the same ticket
  with `--attempt` incremented. Never resolve a conflict yourself, and
  never merge or report the fate yourself while a resolution is
  outstanding.
- **`flagged`** — the cap (3 attempts) was reached; inline resolution
  is abandoned and the ticket was already recycled to `todo/` with a
  `## Flagged` section, carrying `report` the same way `landed` does.
  Terminal — remove the worktree and stop retrying this ticket this
  run; a future `spec-loop` run picks it up fresh (a new claim, a new
  worktree) if it becomes pickable again.

## Failure handling

Distinct from a subagent normally reporting a fate: if a `spec-pass`
subagent invocation itself errors out with nothing at all reported —
- **First crash on a ticket**: retry immediately — spawn a fresh
  subagent on the *same* worktree/branch (so whatever it already
  committed survives), same mode, still tracked **in flight**. Narrate
  it (e.g. "Subagent for #9 crashed — retrying once, same worktree.").
- **Second consecutive crash on the same ticket**: stop retrying it.
  Remove it from **in flight** and add it to **standing failures**
  instead — leave its worktree and ticket file exactly where they sit
  (still `in-progress/` or `review/`); this skill never guesses at a
  fix. Narrate it as a standing failure and keep going — every other
  in-flight or newly-actionable child continues unaffected.

This is separate from, and doesn't replace, the existing
"Consecutive-failure circuit breaker" below, which covers `board-step`/
`board-state` erroring out instead of a subagent.

If `board-step`'s outcome ever names only standing-failure tickets as
its `dispatch` example with nothing else in flight and nothing else
newly-actionable this round (i.e. every remaining actionable child is a
standing failure), the Spec can't mechanically finish this run — stop
the loop and report it the same way as "Blocked" below, naming every
standing-failure ticket as the reason, rather than looping forever
waiting for a fate that will never come.

## Spec review

`board-step` only ever returns `{ "kind": "dispatch-spec-review" }`
once the Spec itself sits in `review/`, which per its own Priority scan
only happens once every child is `done/` — by construction, **in
flight** is already empty by then. Confirm it's empty anyway before
dispatching (this run's own bookkeeping, not a second judgment call);
if it somehow isn't, treat this iteration as still having work to
finish first and don't dispatch `spec-review` yet.

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
through the same concurrent dispatch loop above.

## Consecutive-failure circuit breaker

If running `board-step` or `board-state` errors out with no report at
all, retry that same step once immediately (the same command). If the
retry also errors, stop the loop and report the failure instead of
continuing. (A spawned subagent crashing is handled separately — see
"Failure handling" above; it never stops the whole loop by itself.)

## Blocked

On a `blocked` report — from `board-step` itself, or the standing-
failure case in "Failure handling" above — first let every still-in-
flight child finish landing (or crash out to a standing failure) rather
than stopping mid-flight; once nothing remains in flight, stop.  Do not
ask the user how to unblock it, do not propose workarounds, and do not
take any unblocking action yourself (editing a ticket, running a
command, touching the project repo) — that's a change, and per "The
driving agent only drives" above, this skill never makes those. Just
report why, and end the turn. Unblocking is the user's call, made
outside this skill; re-invoke spec-loop once they've acted.

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
