---
name: spec-loop
description: Drive a Spec's board on agent-tickets to completion — call the fast-path `board-step` tool every iteration, spawning a spec-pass or spec-review subagent only when the next action needs judgment, one at a time and never in parallel, until the board can't be progressed any further.
disable-model-invocation: true
---

# Spec Loop

Invoked with a Spec (number or path). Loops
`agent-tickets/scripts/board-step` over that Spec's board — it
decides and, whenever the next action is purely mechanical, performs
it directly, returning the board's current state alongside its
verdict; a spec-pass or spec-review subagent is spawned only when the
next action needs judgment — until nothing's left it can progress.
`agent-tickets/scripts/board-state` is its read-only counterpart,
called once before the loop starts to render the board's opening
snapshot.

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

## The driving agent only drives

You (the agent running this skill) never make any judgment-driven
change yourself — not to the tracker, not to the project repo, not a
single file, ticket move, or commit, at any point in the loop, beyond
running `board-step` itself (see "Loop" below): that tool call is the
one exception, since it's deterministic and mechanical by construction
— no judgment involved — and it does its own move-plus-commit directly.
Everything else is: spawning subagents, narrating their reports and the
tool's, printing board snapshots, and — when the loop ends — stating
the final outcome. Every judgment-driven change happens inside a
spawned subagent's own `spec-pass` or `spec-review` invocation, never
in this conversation directly. If you notice something that seems to
need fixing (a miswritten ticket, a premature `## Flagged` section, a
missing file) do not fix it yourself — say what you noticed when you
report the outcome, and let the user decide.

## Board snapshot

Rendered from board JSON, never a freehand scan of the kanban folders.
Before the first loop iteration, call `board-state` once (see "Loop"
below) to get that JSON. On every subsequent iteration, render
directly from the `board` field the same iteration's `board-step` call
already returned — no separate re-scan step after acting.

Either tool's JSON has the same shape for this purpose: a `spec`
ticket and a `children` array, each ticket carrying `number`, `slug`,
`folder` (whichever of the four kanban folders it's currently in),
`blockedBy` (ticket numbers it's still waiting on), and `flagged`
(whether it carries a `## Flagged` section) — read these fields
directly; do not re-derive them by reading ticket files yourself.

- For every child with `folder: "todo"`, check its `blockedBy` numbers
  against the `folder` of those tickets in the same JSON, and note any
  still outstanding.
- `flagged: true` marks a ticket flagged directly — no need to inspect
  ticket text for a `## Flagged` section.
- Diff this JSON against the immediately preceding snapshot's JSON to
  find every ticket whose `folder` just changed — those are the rows to
  bold. Usually just one, but a claim on a Spec's first child changes
  two in the same call: the child's row (`todo` → `in-progress`) and
  the Spec's own row (`todo` → `in-progress`, per TICKET-FORMAT.md's
  "Claim") — bold both. Skip the diff on the very first, pre-loop
  snapshot (from `board-state`); nothing's changed yet, so nothing is
  bolded.

Render every snapshot the same way, narration line first:

```
<narration line, e.g. Claimed child #5 ("..."), moved it to in-progress/.>

**Spec #<n> board — <slug>**

| # | Ticket | State |
|---|--------|-------|
| 1 | spec | 🔳 todo |
| 2 | ... | ✅ done |
```

- State column icons, keyed off `folder` (`flagged: true` overrides
  the folder icon): ✅ done · 🟦 review · 🟨 in-progress · 🔳 todo · 🚫
  flagged.
- Append a note to the State cell when relevant — a blocked `todo`
  ticket gets "🔳 todo (needs #5)"; a flagged one gets "🚫 flagged".
- Bold all three cells of every row that just changed `folder`.

## Loop

Before doing anything else, call `board-state` once and print its
board as the starting snapshot (see "Board snapshot" above) — the
board's starting point, nothing bolded yet:

```
board-state <spec-number> <board-dir>
board-state <path-to-spec-ticket-file>
```

Each iteration:

1. Run `board-step` against this Spec, in the same two invocation
   forms as `board-state` above:

   ```
   board-step <spec-number> <board-dir>
   board-step <path-to-spec-ticket-file>
   ```

   It's the sole source of truth for what happens next; never scan the
   board yourself to decide — the board snapshot you print is for
   narration only.
2. Act on its JSON `outcome`:
   - **`{ "kind": "claimed", "ticketNumber": <n>, "slug": "<slug>" }`**
     or **`{ "kind": "spec-ready", "ticketNumber": <n>, "slug":
     "<slug>" }`** — mechanical: the tool already made the change
     itself. Narrate it directly (e.g. "Claimed child #12, moved it to
     in-progress/." or "Spec is ready for review, moved it to
     review/.") — spawn nothing this iteration.
   - **`{ "kind": "dispatch", "ticketNumber": <n>, "mode": "work" |
     "review-child" }`** — spawn a subagent (Agent tool, one at a
     time — never in parallel) instructed to invoke `spec-pass` on
     ticket `#<n>` in that exact mode. It has no memory of this
     conversation, so hand it the ticket number (or path) and the mode
     directly, and have it report back exactly what happened. Narrate
     that outcome (e.g. "coded #12, moved it to review/", "resolved #9
     in review").
   - **`{ "kind": "dispatch-spec-review" }`** — spawn a subagent
     instructed to run `spec-review` on this Spec directly (not
     through `spec-pass` — that skill no longer handles this case).
     Narrate its outcome (e.g. "ran spec-review — reopened with 2 new
     child tickets"). There's no cap on how many times a Spec can cycle
     back through `spec-review` this way.
   - **`{ "kind": "done" }`** or **`{ "kind": "blocked", "reason":
     "<reason>" }`** — the loop is over; see "Blocked" and "Report"
     below.
3. Render the board snapshot from this same call's `board` field, per
   "Board snapshot" above — no separate re-scan step.
4. Unless step 2 was `done` or `blocked`, repeat from 1.

## Consecutive-failure circuit breaker

If running `board-step` or `board-state`, or a spawned subagent's
call, errors out with no report at all, retry that same step once
immediately (the same command, or the same subagent briefing). If the
retry also errors, stop the loop and report the failure instead of
continuing.

## Blocked

On a `blocked` report, stop immediately. Do not ask the user how to
unblock it, do not propose workarounds, and do not take any unblocking
action yourself (editing a ticket, running a command, touching the
project repo) — that's a change, and per "The driving agent only
drives" above, this skill never makes those. Just report why, per
`board-step`'s reported reason, and end the turn. Unblocking is the
user's call, made outside this skill; re-invoke spec-loop once they've
acted.

## Report

Take one final board snapshot and print it, then state the board's
final outcome below it:

- `done` — the Spec reached `done/`.
- `blocked` — say why, per `board-step`'s reported reason.
- Stopped after a repeated technical failure — say what the error was.
