# Recovery

Companion to `SKILL.md`, reached by its pointers. Everything here is
unhappy-path detail for `run-spec`: what to do when a landing attempt
conflicts, when a subagent crashes outright, or when `board-step`/
`board-state` themselves start erroring out. None of it changes the
happy-path steps in `SKILL.md`'s "Run" and "Landing" sections — it only
covers what those sections point here for.

## Landing conflict retries

Detail for `land-child`'s `needs-resolution` result, pointed to from
`SKILL.md`'s "Landing" section.

- **Whenever `land-child` reports `needs-resolution`** — the branch
  conflicts with the base as it stands right now; carries `diff` (what
  didn't apply) and `attempt` (this call's own 1-indexed try). Dispatch
  a fresh conflict-resolution `spec-pass` **`work`** subagent on the
  *same* worktree/branch — still tracked **in flight** under this same
  ticket, not a new entry — handed `diff` and told to resolve it
  against the base and commit. Once that subagent reports back, call
  `land-child` again for the same ticket with `--attempt` incremented.
  Never resolve a conflict yourself, and never merge or report the fate
  yourself while a resolution is outstanding.
- **After 3 attempts** — `land-child` gives up automatically: inline
  resolution is abandoned and the ticket is recycled to `todo/` with a
  `## Flagged` section itself, reporting `flagged` back exactly as
  `SKILL.md`'s "Landing" section describes.

## Failure handling

Distinct from a subagent normally reporting a fate: whenever a
`spec-pass` subagent invocation errors out with nothing at all
reported —
- **On the first such crash for a ticket**: retry immediately — spawn
  a fresh subagent on the *same* worktree/branch (so whatever it
  already committed survives), same mode, still tracked **in flight**.
  Narrate it (e.g. "Subagent for #9 crashed — retrying once, same
  worktree.").
- **On a second consecutive crash for the same ticket**: stop retrying
  it. Remove it from **in flight** and add it to **standing failures**
  instead — leave its worktree and ticket file exactly where they sit
  (still `in-progress/` or `review/`); this skill never guesses at a
  fix. Narrate it as a standing failure and keep going — every other
  in-flight or newly-actionable child continues unaffected.

This is separate from, and doesn't replace, the "Consecutive-failure
circuit breaker" below, which covers `board-step`/`board-state`
erroring out instead of a subagent.

Whenever `board-step`'s outcome names only standing-failure tickets as
its `dispatch` example, with nothing else in flight and nothing else
newly-actionable this round (i.e. every remaining actionable child is a
standing failure), the Spec can't mechanically finish this run — report
it as blocked, the same way as `SKILL.md`'s "Blocked" section, naming
every standing-failure ticket as the reason, rather than dispatching
forever waiting for a fate that will never come.

## Consecutive-failure circuit breaker

Whenever running `board-step` or `board-state` itself errors out with
no report at all, retry that same call once immediately (the same
command). If the retry also errors, stop dispatching further and
report the failure instead of continuing. (A spawned subagent crashing
is handled separately — see "Failure handling" above; it never stops
dispatch by itself.)
