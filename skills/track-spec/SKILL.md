---
name: track-spec
description: Watch a Spec's board over time, re-rendering its status table on a recurring interval, bolding rows that changed since the last tick. Use when the user wants to monitor an ongoing spec-loop run or otherwise track a Spec's progress live.
argument-hint: "<project> <spec-number> [interval]"
---

# Track Spec

Invoked with a project, a Spec number, and an optional interval
(default 60 seconds). The project and Spec number are required, same
as `spec-board` and for the same reason — ticket numbers are only
unique within a project. Resolve and validate them exactly as
`spec-board` does; stop the same way if either doesn't resolve.

## Render

Every tick renders the same table `spec-board` does — see its own
SKILL.md for the exact format (icons, labels, notes) and how it scans
the board — with one addition layered on top: **bold all three cells**
of every row whose folder differs from the last table this session
printed. The very first tick has nothing to diff against, so nothing in
it is bold. Every tick prints its table regardless of whether anything
changed — the point is a live, always-current view, not just the
deltas.

Hold the last-printed table's rows in this conversation only (nothing
written to disk), so every later tick has something to diff against for
the bold rule above.

The table is the entire output of every tick — no preamble, no
summary line, no acknowledgement before or after it.

## Tick loop

Render once immediately per "Render" above (nothing to diff against
yet, so nothing is bold), then start a recurring prompt in this
conversation at the given interval (`CronCreate`, `recurring: true`)
carrying a fixed instruction to re-scan this Spec's board and render
per "Render" again. Each firing does exactly that — nothing else; this
skill never claims, dispatches, or moves anything, only reads.

Stop the loop (`CronDelete`) the moment the Spec's own ticket reaches
`done/` — the one on-disk signal that's unambiguous and permanent.
Keep ticking through every other state, including `blocked`, since a
blocked Spec can later be unblocked and resumed. Stop early if the user
asks to stop tracking.
