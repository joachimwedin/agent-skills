---
name: spec-loop
description: Drive a Spec's board on agent-tickets to completion — call the fast-path `next-action` tool every iteration, spawning a spec-pass or spec-review subagent only when the next action needs judgment, one at a time and never in parallel, until the board can't be progressed any further.
disable-model-invocation: true
---

# Spec Loop

Invoked with a Spec (number or path). Loops
`agent-tickets/scripts/next-action` over that Spec's board — it
decides and, whenever the next action is purely mechanical, performs
it directly; a spec-pass or spec-review subagent is spawned only when
the next action needs judgment — until nothing's left it can progress.

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
running `next-action` itself (see "Loop" below): that tool call is the
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

Before the first loop iteration, and again after every subsequent one,
scan the Spec's board yourself — a read, not a change, so it doesn't
conflict with "The driving agent only drives" above:

- List the four folders under
  `~/repos/agent-tickets/boards/<project>/{todo,in-progress,review,done}/`.
  Each ticket's number and slug come from its filename
  (`<n>-<slug>.md`); its state is whichever of the four folders it's
  currently sitting in.
- For every ticket in `todo/`, check its `## Blocked by` references
  against which folder *those* tickets are in, and note any still
  outstanding.
- Check each ticket for a `## Flagged` section.
- Diff this scan against the immediately preceding one to find which
  ticket's folder just changed — that's the row to bold. Skip the diff
  on the very first, pre-loop scan; nothing's changed yet, so nothing
  is bolded.

Render every snapshot the same way, narration line first:

```
<narration line, e.g. Claimed child #5 ("..."), moved it to in-progress/.>

**Spec #<n> board — <slug>**

| # | Ticket | State |
|---|--------|-------|
| 1 | spec | 🔳 todo |
| 2 | ... | ✅ done |
```

- State column icons: ✅ done · 🟦 review · 🟨 in-progress · 🔳 todo ·
  🚫 flagged.
- Append a note to the State cell when relevant — a blocked `todo/`
  ticket gets "🔳 todo (needs #5)"; a flagged one gets "🚫 flagged".
- Bold all three cells of whichever row just changed folder.

## Loop

Before doing anything else, take a board snapshot (see "Board
snapshot" above) and print it — the board's starting point, nothing
bolded yet.

Each iteration:

1. Run `~/repos/agent-tickets/scripts/next-action` against this Spec
   (its own ticket file path, or its number plus the project's board
   directory — see the tool's usage). It's the sole source of truth
   for what happens next; never scan the board yourself to decide —
   the board snapshot you print is for narration only.
2. Act on what it reports:
   - **`claimed #<n> (<slug>) -- moved to in-progress/ and committed`**
     or **`Spec #<n> (<slug>) is ready for review -- moved to review/
     and committed`** — mechanical: the tool already made the change
     itself. Narrate it directly (e.g. "Claimed child #12, moved it to
     in-progress/." or "Spec is ready for review, moved it to
     review/.") — spawn nothing this iteration.
   - **`#<n> needs judgment -- mode: work`** or **`#<n> needs judgment
     -- mode: review-child`** — spawn a subagent (Agent tool, one at a
     time — never in parallel) instructed to invoke `spec-pass` on
     ticket `#<n>` in that exact mode. It has no memory of this
     conversation, so hand it the ticket number (or path) and the mode
     directly, and have it report back exactly what happened. Narrate
     that outcome (e.g. "coded #12, moved it to review/", "resolved #9
     in review").
   - **`the Spec itself needs judgment -- mode: spec-review`** — spawn
     a subagent instructed to run `spec-review` on this Spec directly
     (not through `spec-pass` — that skill no longer handles this
     case). Narrate its outcome (e.g. "ran spec-review — reopened with
     2 new child tickets"). There's no cap on how many times a Spec
     can cycle back through `spec-review` this way.
   - **`done`** or **`blocked -- <reason>`** — the loop is over; see
     "Blocked" and "Report" below.
3. Take a fresh board snapshot and print it, per "Board snapshot"
   above.
4. Unless step 2 was `done` or `blocked`, repeat from 1.

## Consecutive-failure circuit breaker

If running `next-action`, or a spawned subagent's call, errors out
with no report at all, retry that same step once immediately (the same
command, or the same subagent briefing). If the retry also errors,
stop the loop and report the failure instead of continuing.

## Blocked

On a `blocked` report, stop immediately. Do not ask the user how to
unblock it, do not propose workarounds, and do not take any unblocking
action yourself (editing a ticket, running a command, touching the
project repo) — that's a change, and per "The driving agent only
drives" above, this skill never makes those. Just report why, per
`next-action`'s reported reason, and end the turn. Unblocking is the
user's call, made outside this skill; re-invoke spec-loop once they've
acted.

## Report

Take one final board snapshot and print it, then state the board's
final outcome below it:

- `done` — the Spec reached `done/`.
- `blocked` — say why, per `next-action`'s reported reason.
- Stopped after a repeated technical failure — say what the error was.
