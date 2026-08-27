# Recovery

Companion to `SKILL.md`, reached by its pointers. Everything here is
unhappy-path detail for `spec-loop`: what to do when a landing attempt
conflicts, when a subagent crashes outright, or when a mechanical step
this skill performs directly starts erroring out. None of it changes
the happy-path steps in `SKILL.md`'s "Run" and "Landing" sections — it
only covers what those sections point here for.

## Landing conflict retries

Detail for "Landing"'s conflict case in `SKILL.md`.

- **Whenever a landing attempt conflicts** — the child's branch
  conflicts with the base as it stands right now. Track this ticket's
  own 1-indexed `attempt` counter, starting at 1 on its first landing
  attempt this run. Recover the conflicting diff (`git -C
  <project-repo-dir> diff <spec-branch>...<child-branch>`, taken right
  after aborting the merge) and dispatch a fresh conflict-resolution
  `spec-pass` **`work`** subagent on the *same* worktree/branch — still
  tracked **in flight** under this same ticket, not a new entry —
  handed that diff and told to resolve it against the base and commit.
  Once that subagent reports back, attempt landing this same ticket
  again with `attempt` incremented by one. Never resolve a conflict
  yourself, and never merge or enact the fate yourself while a
  resolution is outstanding.
- **After 3 attempts** — give up automatically: inline resolution is
  abandoned, and the ticket is recycled to `todo/` with a `## Flagged`
  section instead of the fate it originally reported, reporting
  `flagged` back exactly as `SKILL.md`'s "Landing" section describes
  for a clean-but-abandoned case.

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
circuit breaker" below, which covers a mechanical step this skill
performs directly erroring out instead of a subagent.

Whenever the Priority scan's remaining actionable items are only
standing-failure tickets, with nothing else in flight and nothing else
newly-actionable this round, the Spec can't mechanically finish this
run — report it as blocked, the same way as `SKILL.md`'s "Blocked"
section, naming every standing-failure ticket as the reason, rather
than dispatching forever waiting for a fate that will never come.

## Consecutive-failure circuit breaker

Whenever a mechanical step this skill performs directly — scanning the
board, resolving/creating the base branch, creating or removing a
worktree, attempting a landing merge — errors out unexpectedly, retry
that same step once immediately. If the retry also errors, stop
dispatching further and report the failure instead of continuing. (A
spawned subagent crashing is handled separately — see "Failure
handling" above; it never stops dispatch by itself.)
