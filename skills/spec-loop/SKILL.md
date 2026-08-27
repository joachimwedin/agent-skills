---
name: spec-loop
description: Drives a Spec's board on agent-tickets to completion, dispatching spec-pass/spec-review subagents concurrently for every workable child and landing each as it finishes.
disable-model-invocation: true
---

# Spec Loop

Invoked with a Spec (number or path). Drives that Spec's board directly
— scanning the four kanban folders itself, performing every purely
mechanical move (a claim, the Spec's own move to `review/`, enacting a
reported fate) as a plain file move, no tool involved.
Whenever the next action needs judgment, a `spec-pass` or `spec-review`
subagent is spawned for every currently-workable child at once, each
in its own isolated project-repo worktree and branch, until nothing's
left to progress and nothing remains in flight.

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
     the turn, without looping back to let the user pick a different
     project.
   - **Exactly one** — state which one and why, and ask the user to
     confirm before proceeding. On "no", end the turn, without looping
     back to project selection.
   - **More than one** — ask the user to pick.

   Either way, nothing here loops back to an earlier choice —
   re-invoking `/spec-loop` is cheap, so the user just runs it again.
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
  exception the same way the board moves below are.

## The driving agent only drives

You (the agent running this skill) make only these mechanical changes
yourself, at any point during this run — each deterministic by
construction, no judgment involved — and nothing else:

- Scanning the board (see "Run" below) — a read, never a change.
- Performing a **Claim** or **Spec ready** move (see "Run" below and
  TICKET-FORMAT.md's "Spec board operations") — a plain file move on
  disk, nothing else.
- Resolving/creating the Spec's base branch (see "Project repo and
  base branch" above).
- Creating and removing a child's worktree/branch, and landing a
  finished child (see "Landing" below) — attempting the merge in the
  project repo and, on a clean result, enacting its already-decided
  fate as that same kind of plain file move.

Everything else is: spawning subagents, narrating their reports and
what you scanned, and — once the run ends — stating the final outcome.
Every judgment-driven change — to the
tracker, the project repo, a single file, ticket move, or commit —
happens inside a spawned subagent's own `spec-pass` or `spec-review`
invocation, never in this conversation directly — that subagent reports
the fate it decided rather than moving anything itself
(TICKET-FORMAT.md's "Report fate"). If you notice something that seems
to need fixing (a miswritten ticket, a premature `## Flagged` section,
a missing file), say what you noticed when you report the outcome and
let the user decide, rather than fixing it yourself.

## No locking, single-writer

Safety comes from two invariants this skill must never violate:

- This conversation's own orchestrating process is the *only* thing
  that ever writes into the shared `agent-tickets` directory (whether
  the transition is mechanical or a reported fate being enacted), and
  the *only* thing that ever merges a child's branch onto the Spec's
  base branch in the shared project-repo checkout.
- Every genuinely concurrent write — a `spec-pass` subagent's own
  coding — happens inside that child's own isolated worktree, which no
  other subagent or process ever touches.

## Run

Four rules govern dispatch, named rather than numbered because none of
them run in sequence: each fires the instant its trigger condition
holds, more than one can fire in the same beat, and none of them wait
their turn on any other. Together they dispatch every currently-
workable child at once, land each as it reports back, and keep firing
until the board can't be progressed any further.

"Scan the board" always means: list the four folders under
`~/repos/agent-tickets/boards/<project>/{todo,in-progress,review,done}/`
— each ticket's number and slug come from its filename
(`<n>-<slug>.md`), and its state is whichever folder it's currently
sitting in — then, for every ticket in `todo/`, check its `## Blocked
by` references against which folder *those* tickets are in, and check
every ticket for a `## Flagged` section. TICKET-FORMAT.md's "Priority
scan" (under "Spec board operations") is the sole source of truth for
what this scan means by pickable and ready — apply it directly against
your own board scan every time this section says "scan the board";
never invent a different ordering or shortcut it. If a board scan or a
spawned subagent's call itself errors out with no report at all, see
RECOVERY.md's "Consecutive-failure circuit breaker".

Before doing anything else, resolve the project repo and base branch
(see above), then scan the board — the board's starting point, nothing
in flight yet.

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

- **Startup** — apply the Priority scan to the board you just scanned:

   For every currently-pickable child (step 4 of the Priority scan),
   claim it: move its file to `in-progress/`. If this is the first
   child claimed on this Spec's board, also move the Spec's own file
   from `todo/` to `in-progress/`, one-way and never repeated after.
   Narrate every claim together (e.g. "Claimed children #5 and #12,
   moved them to in-progress/."). Either way, dispatch a subagent for
   every child now sitting in `in-progress/` or `review/` — every one
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
     anything itself.
   - Land it (see "Landing" below) — landing is what performs that
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

   This landing changes the board, so re-scan it the same way Startup
   did, and re-apply the Priority scan: any newly-pickable children
   (claimed the same way as Startup) and any children now sitting in
   `in-progress/` (newly unblocked because this landing satisfied their
   `## Blocked by`) or `review/` (just moved there by this landing) that
   aren't already tracked **in flight** and aren't a **standing
   failure** — dispatch a fresh subagent for every one, worktree
   creation included, exactly the same way as Startup. Every child found
   is dispatched in the same beat — sent together — and never waits for
   any other still-in-flight child to finish first: a child found
   dispatchable because of a later landing is dispatched immediately,
   the moment it's found, exactly the same way.

- **On every child reaching `done/`** — the Priority scan's step 2
   fires: move the Spec itself to `review/`, narrated as "Spec is ready
   for review, moved it to review/." (this can only happen once nothing
   is in flight, since every child must be `done/` first). Immediately
   spawn a `spec-review` subagent for the Spec itself (see "Spec
   review" below). A `spec-review` reporting `flagged` (new children
   filed) is not a separate rule — it is just the Startup and On-a-
   ticket-landing rules above firing again once those new children
   exist on the board.

- **Terminal** — once nothing is left to dispatch and nothing remains
   **in flight**, the run ends. The Priority scan's step 5 applies:
   either the Spec has reached `done/`, or it's `blocked` — still
   `todo/`/`in-progress/` with nothing pickable (say why, naming any
   standing failures — see RECOVERY.md and "Blocked" below for the
   standing-failure rule itself).

## Landing

Composes the merge-onto-base attempt with the ticket's fate-enactment
in one step, so a caller of this section never splits them across two
separate actions:

1. Check out the Spec's base branch in the project repo, then attempt
   merging the child's branch onto it (e.g.
   `git -C <project-repo-dir> merge --no-ff <child-branch>`).
2. **Clean merge** — enact the fate the subagent reported (see
   TICKET-FORMAT.md's "Report fate" for what each fate moves): a plain
   file move in `agent-tickets`. Terminal for this landing — proceed as
   in Run's "On a ticket landing" rule above.
3. **Conflict** — abort the merge (`git -C <project-repo-dir> merge
   --abort`), leaving the base exactly as it stood before this attempt.
   See RECOVERY.md's "Landing conflict retries" for the retry protocol
   before attempting to land this ticket again.

## Spec review

The Priority scan only reaches its "Spec itself in `review/`" case once
every child is `done/` — by construction, **in flight** is already
empty by then. Confirm it's empty anyway before dispatching (this run's
own bookkeeping, not a second judgment call); if it somehow isn't,
treat this as still having work to finish first and don't dispatch
`spec-review` yet.

Once confirmed, spawn a subagent instructed to run `spec-review` on
this Spec directly (not through `spec-pass` — that skill no longer
handles this case). It likewise reports the Spec's own fate — `flagged`
(filed new child tickets, with a reason naming them) or `done` — rather
than moving anything itself. Enact it directly, the same plain-file-
move way as any other fate (a Spec's own fate never goes through
"Landing" — no child branch is involved).

Narrate both the review's outcome and the resulting move (e.g. "ran
spec-review — reopened with 2 new child tickets, moved back to
in-progress/"). There's no cap on how many times a Spec can cycle back
through `spec-review` this way — a reopened Spec's new children flow
through the same concurrent dispatch rules above.

## Blocked

On a `blocked` outcome — from the Priority scan itself, or the
standing-failure case in RECOVERY.md's "Failure handling" — first let
every still-in-flight child finish landing (or crash out to a standing
failure) rather than stopping mid-flight; once nothing remains in
flight, report why and end the turn. Unblocking is the user's call,
made outside this skill: this skill only reports the reason — it never
asks the user how to unblock it, proposes workarounds, or takes any
unblocking action itself (editing a ticket, running a command, touching
the project repo), since that would be a change, and per "The driving
agent only drives" above this skill never makes those. Re-invoke
spec-loop once the user has acted.

## Report

Scan the board one final time, then state its final outcome:

- `done` — the Spec reached `done/`.
- `blocked` — say why, per the Priority scan's reason, or per any
  standing failures that prevented it from finishing.
- Stopped after a repeated technical failure — say what the error was.

Always name every standing failure from this run in the final report,
even if the Spec otherwise reached `done/` on its remaining children —
a standing failure never blocks siblings from finishing, but it's never
silently dropped either.
