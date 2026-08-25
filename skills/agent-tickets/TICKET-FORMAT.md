# Ticket Format

Tickets live as markdown files in `~/repos/agent-tickets/` — a dedicated
local git repo, not inside any consuming project's own checkout. It
represents "the issue tracker" as a single shared concept; each project
that uses it gets its own subfolder underneath, named after that
project's own slug (match whatever's already there, or pick a fresh one
if this is the project's first ticket). A **Spec** is just another
ticket — the one a **child ticket** points back to via `## Parent`.
Specs and their child tickets share one numbering sequence, independent
per project.

- **Spec file**: `~/repos/agent-tickets/boards/<project>/<n>-spec-<slug>.md`
- **Child ticket file**: `~/repos/agent-tickets/boards/<project>/<n>-<slug>.md` (no `spec-` prefix)

## Kanban folders

Every ticket — Spec or child — moves through the same four folders, all
under `~/repos/agent-tickets/boards/<project>/`:

- `todo/` — not yet started.
- `in-progress/` — currently being worked on.
- `review/` — coding done, awaiting review.
- `done/` — fully complete.

## Ticket template

Every ticket file opens directly with a title, followed by four sections
(a fifth, `## Flagged`, only appears once added — see below):

```
# <Title>

## Parent

Spec #<n>

## What to build

...

## Acceptance criteria

- [ ] ...

## Blocked by

- Ticket #<n> (<why>) — or "None - can start immediately"
```

Keep `<Title>` short — roughly six words — for both a Spec and a child
ticket: it's what a human scans when picking work off the frontier, and
a long title is unwieldy wherever it gets reused (e.g. slugified into a
branch name by whatever runs the ticket).

## Flagged tickets

A child ticket that a coding pass couldn't finish for reasons outside
its control (e.g. a sandbox blocks a genuinely required command) gets a
`## Flagged` section appended, explaining why, before being moved back
to `todo/`:

```
## Flagged

<why this needs a human, e.g.: needs `<package>@<version>` added as a
dependency — a coding pass can't run the installer, a human has to.>
```

`to-tickets` writes a ticket flagged from the start whenever a slice's
only work is adding, removing, or updating a dependency.

Either way, a flagged ticket is excluded from pickup until a human
deletes the section.

## Commit on every transition

`agent-tickets` is a real git repo specifically so its history doubles
as an audit trail. Every state change to a ticket — creation, a move
between kanban folders, appending an answer or a `## Flagged` section —
gets its own commit in that repo, made as part of the same step that
changes the file. A commit message names the ticket and the transition,
e.g. `12: claim — add-dark-mode-toggle` or `7: done — trim-cache-ttl`.
Commit each ticket's transition separately, even across multiple
tickets moved in the same session. This covers every file the
Wayfinding operations below touch too, including an edit to the map
itself (e.g. appending to its Decisions so far).

## When a skill says "publish to the tracker"

Create a new file under `~/repos/agent-tickets/boards/<project>/todo/`,
following the Spec/Child ticket file pattern and Ticket template above,
and commit it. `<n>` continues the project's existing shared ticket
sequence — check across all four kanban folders for the highest number
in use, or start at 1 if none exist yet.

## When a skill says "fetch the relevant ticket"

Read the file directly at the referenced path, or by number — the
number is shared across Specs and child tickets, so it uniquely
identifies one file somewhere under `~/repos/agent-tickets/boards/<project>/todo/`,
`in-progress/`, `review/`, or `done/`.

## Spec board operations

Used by `spec-pass`, `spec-loop`, and `spec-review`, for an ordinary Spec (no
`Type: wayfinder-map` line) whose children are build tickets — the
shape `to-spec`/`to-tickets` produce.

This whole board — the Priority scan below and the mechanical
transitions it can trigger — is computed and (where mechanical)
executed by `agent-skills/scripts/board-step`, a deterministic tool
taking a Spec (number or path) and returning either what it already
did, or the ticket/mode a judgment pass needs, together with the
board's current state. `agent-skills/scripts/board-state` is its
read-only counterpart — same Spec argument, same board-state JSON, but
makes no move and no commit; it's used to render the board for
narration, never to decide what happens next. `spec-loop` calls
`board-step` every iteration and `board-state` once before the first;
`spec-pass` never scans a board or reaches this decision itself — it's
always handed an explicit ticket and mode.

Neither `spec-pass` nor `spec-review` moves or commits a ticket into
`agent-tickets` itself once a judgment pass decides where that ticket
ends up — see "Report fate" below. `board-step report`, given a ticket
number and that reported fate, is the sole executor of the move and
commit either way, using the same commit-message conventions
`board-step`'s own mechanical Claim/Spec-ready steps already use.

- **Pickable**: a child ticket in `todo/` with no `## Flagged` section
  and every `## Blocked by` reference already in `done/`.
- **Priority scan**: every currently-actionable item on a Spec's board
  at once, checked in this order —
  1. The Spec *itself* already sitting in `review/` is a hard barrier —
     outranks everything else, no matter what state any child is in.
     (A child sitting in `review/` is not this case — see step 3.)
  2. The Spec is still `todo/` or `in-progress/` and every child is
     `done/`: the Spec itself is ready for review. (The `todo/` case only
     fires on a manually-edited board — e.g. a child dropped straight
     into `done/` without ever being claimed. Through normal `spec-pass`
     operation the Spec is always `in-progress/` by this point, since
     claiming a child now always moves the Spec there first.)
  3. Otherwise, the union of every child in `review/` (child review) and
     every child in `in-progress/` (work) — every one of each, not just
     one at a time, and no priority ordering between them.
  4. Every currently-pickable child in `todo/` claims at once — not just
     the lowest-numbered one; ticket category (bugfix, infra, tracer
     bullet, polish, refactor) plays no part.
  5. Otherwise the Spec is `done` (it has reached `done/`) or `blocked`
     (still `todo/`/`in-progress/` with nothing pickable — e.g. the only
     remaining child is `## Flagged` or has an unresolved
     `## Blocked by`).

  `spec-loop` dispatches every judgment item from step 3 concurrently —
  a `spec-pass` subagent per child, each in its own isolated project-repo
  worktree and branch — never one at a time; see its own SKILL.md for
  the dispatch/landing mechanics. `spec-pass` run directly by a person
  still only ever handles the one ticket it's told about.
- **Claim**: move a child ticket to `in-progress/`, commit, and stop —
  claiming is its own action, separate from the work that follows. Every
  simultaneously-pickable child claims together in one pass, each with
  its own move and commit — more than one child can sit `in-progress/`
  at once. The first child claimed on a Spec's board also moves the Spec
  itself from `todo/` to `in-progress/`, one-way and never repeated
  after — the board then shows work is underway even before any child
  reaches `review/`. Purely mechanical — `board-step` is the sole
  executor, performing the move and commit itself; no judgment pass is
  ever spawned for this step.
- **Spec ready**: once every child is `done/`, move the Spec itself to
  `review/` and commit. Purely mechanical, same as Claim — `board-step`
  is the sole executor; no judgment pass is spawned for this step
  either.
- **Work**: carry a child already sitting in `in-progress/` to a
  terminal state — ready for `review/` once done, or flagged and headed
  back to `todo/` with a `## Flagged` section if it can't be finished
  — then report that fate (see "Report fate" below) rather than moving
  or committing it directly. A judgment pass (`spec-pass`, mode `work`)
  is always spawned with this exact ticket named, never left to
  rediscover it.
- **Child review**: decide the child's fate against its own
  `## Acceptance criteria` — fix what's missing or approve outright,
  tick any boxes that now reflect reality — then report it `done`
  rather than moving or committing it directly. A child's review always
  ends at `done/`, never back for more coding. A judgment pass
  (`spec-pass`, mode `review-child`) is always spawned with this exact
  ticket named.
- **Spec review**: when the item sitting in `review/` is the Spec
  itself, that's `spec-review`'s job, not an ordinary child review — a
  `spec-review` pass is spawned directly, not through `spec-pass`. It
  reports the Spec's own fate the same way a child does — `flagged`
  (filed one or more new child tickets; the Spec still has more work
  ahead of it) or `done` (fixed everything directly, or found nothing
  to flag) — rather than moving or committing the Spec itself directly.
- **Report fate**: `spec-pass` (either mode) and `spec-review` never
  run `board-step report` themselves, no matter how mechanical that
  call now is — each only reports the fate it decided back to whoever
  invoked it (`spec-loop`, or a person running the skill directly).
  That caller, and only that caller, then runs `board-step report
  <ticket-number> <board-dir> --fate <fate> [--reason "<why>"]`
  (or the self-describing ticket-file-path form) to enact it. Exactly
  three fates exist, shared by every caller above:
  - `ready-for-review` — `in-progress/` → `review/`. Only ever reported
    for a child (`spec-pass`, `work` mode, finished); never for the
    Spec itself, whose own review-readiness is already fully mechanical
    (see "Spec ready" above).
  - `flagged` — more work remains before this ticket can close out.
    For a child (`spec-pass`, `work` mode, blocked) that's
    `in-progress/` → `todo/` plus an appended `## Flagged` section
    explaining why — `--reason` is required. For the Spec itself
    (`spec-review`, having filed new child tickets rather than fixing
    everything in place) that's `review/` → `in-progress/` instead —
    no `## Flagged` section is appended (Specs don't carry one; the new
    child tickets already represent the outstanding work).
  - `done` — `review/` → `done/`. Reported by a child (`spec-pass`,
    `review-child` mode, approved) and by the Spec itself
    (`spec-review`, nothing left to fix or file) alike.

  `board-step report` performs the move and commit itself, using the
  same commit-message conventions as `board-step`'s mechanical Claim/
  Spec-ready steps (e.g. `12: review — add-dark-mode-toggle`, `7: done
  — trim-cache-ttl`, `9: flag — trim-cache-ttl (needs npm access)`, `1:
  reopened — spec-widget-overhaul`). Only the tracker move is
  mechanical this way — filing a new child ticket (`spec-review`) and
  any project-repo commits (both skills) still happen directly, per
  "publish to the tracker" and "Project commits" below. A child fate
  coming out of `spec-loop`'s own concurrent dispatch is the one
  exception to calling `board-step report` directly: it's routed
  through `land-child` instead, which merges that child's branch onto
  the Spec's base branch first and only then calls this same
  fate-enactment path — see `spec-loop`'s own SKILL.md, "Landing".
- **Project commits**: when coding or reviewing changes the *project's*
  own repo (not `agent-tickets`), describe the code decisions only —
  the ticket number and filename are local, ephemeral tracker artifacts
  with no place in the project's own history.

## Wayfinding operations

Used by `wayfinder`. The **map** is a Spec; its **children** are
ordinary child tickets, linked and numbered exactly as above.

- **Map**: a Spec (`~/repos/agent-tickets/boards/<project>/<n>-spec-<slug>.md`).
  A `Type: wayfinder-map` line under the title marks it as one,
  mirroring child tickets below. Its body carries the wayfinder map
  shape instead of `## What to build` / `## Acceptance criteria`:
  `## Destination`, `## Notes`, `## Decisions so far`,
  `## Not yet specified`, `## Out of scope`.
- **Child ticket**: a child ticket
  (`~/repos/agent-tickets/boards/<project>/<n>-<slug>.md`), `## Parent`
  pointing at the map as usual. `## What to build` / `## Acceptance
  criteria` are replaced by `## Question` — a ticket resolves a
  decision, not a build. A `Type: <research|prototype|grilling|task>`
  line under the title (before `## Parent`) records the ticket type.
- **Blocking**: the existing `## Blocked by` field, unchanged.
- **Frontier**: child tickets of the map sitting in `todo/` whose every
  `## Blocked by` entry is in `done/`.
- **Claim**: move the file to `in-progress/` before any work.
- **Resolve**: append the answer under a `## Answer` heading, then move
  the file straight to `done/` — skip `review/`; a decision ticket's
  review already happened live in the conversation that produced the
  answer. Finally, append a context pointer (the ticket's title and
  number, plus a one-line gist) to the map's `## Decisions so far`.
- **Out of scope**: when a ticket turns out to sit beyond the
  destination, close it the same way as a resolve — append `## Answer`
  noting it's out of scope (e.g. "Out of scope — see map") and move the
  file to `done/` — but record the one-line gist on the map's `## Out of
  scope` section instead of `## Decisions so far`. Every closed ticket
  ends up in `done/` with an `## Answer` either way; the map is what
  tells the two apart.
