# Recovery

Companion to `SKILL.md`, reached by its pointers. Everything here is
unhappy-path detail for `spec-loop`: what to do when a landing attempt
conflicts, when a subagent crashes outright, or when a mechanical step
this skill performs directly starts erroring out. None of it changes
the happy-path steps in `SKILL.md`'s "Run" and "Landing" sections — it
only covers what those sections point here for.

## Landing conflict recovery

Detail for "Landing"'s conflict case in `SKILL.md`.

- **Whenever a landing attempt conflicts** — the child's branch
  conflicts with the base as it stands right now. Abort the merge,
  then dispatch a fresh conflict-resolution `spec-pass` **`work`**
  subagent on the *same* worktree/branch — still tracked **in flight**
  under this same ticket, not a new entry — told to rebase its branch
  onto the current base (`git rebase <spec-branch>`, from within the
  child's own worktree). For each commit git stops on, judge that
  conflict on its own merits as it arises:
  - **Small and mechanical** (a few line-level conflicts, clearly
    resolvable without redesigning anything) — resolve it and continue
    the rebase.
  - **Not** (structural conflicts — e.g. a file the base deleted or
    relocated wholesale, logic the base has since rewritten around) —
    abort the rebase immediately (`git rebase --abort`, leaving the
    branch exactly as it stood before this attempt) and report
    `flagged`, naming the commit and why reworking from scratch against
    the current base looks easier than resolving this rebase.
  Never resolve a conflict yourself, and never merge or enact the fate
  yourself while this subagent is outstanding.
- **On a clean rebase** (every commit replayed with no unresolvable
  conflict) — attempt landing this same ticket again; the branch is now
  rebased onto the base, so this landing is a fast-forward or trivially
  clean merge.
- No fixed retry count: one rebase attempt is enough for the subagent
  to reach a verdict on every commit at once. A second identical
  attempt wouldn't learn anything the first didn't already judge.

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
