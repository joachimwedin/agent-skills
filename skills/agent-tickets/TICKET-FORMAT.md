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
executed by `agent-tickets/scripts/board-step`, a deterministic tool
taking a Spec (number or path) and returning either what it already
did, or the ticket/mode a judgment pass needs, together with the
board's current state. `agent-tickets/scripts/board-state` is its
read-only counterpart — same Spec argument, same board-state JSON, but
makes no move and no commit; it's used to render the board for
narration, never to decide what happens next. `spec-loop` calls
`board-step` every iteration and `board-state` once before the first;
`spec-pass` never scans a board or reaches this decision itself — it's
always handed an explicit ticket and mode.

- **Pickable**: a child ticket in `todo/` with no `## Flagged` section
  and every `## Blocked by` reference already in `done/`.
- **Priority scan**: the single next action for a Spec's board, checked
  in this order —
  1. Something already in `review/` — the Spec itself, or a child —
     outranks everything else.
  2. The Spec is still `todo/` or `in-progress/` and every child is
     `done/`: the Spec itself is ready for review. (The `todo/` case only
     fires on a manually-edited board — e.g. a child dropped straight
     into `done/` without ever being claimed. Through normal `spec-pass`
     operation the Spec is always `in-progress/` by this point, since
     claiming a child now always moves the Spec there first.)
  3. A child already sits in `in-progress/` — it's been claimed but not
     yet carried to a terminal state: work it.
  4. A pickable child sits in `todo/`: claim it — the lowest ticket
     number among every simultaneously pickable child, deterministically,
     every time. No other priority ordering exists; ticket category
     (bugfix, infra, tracer bullet, polish, refactor) plays no part.
  5. Otherwise the Spec is `done` (it has reached `done/`) or `blocked`
     (still `todo/`/`in-progress/` with nothing pickable — e.g. the only
     remaining child is `## Flagged` or has an unresolved
     `## Blocked by`).
- **Claim**: move a child ticket to `in-progress/`, commit, and stop —
  claiming is its own action, separate from the work that follows. At
  most one child in-progress at a time. The first child claimed on a
  Spec's board also moves the Spec itself from `todo/` to `in-progress/`,
  one-way and never repeated after — the board then shows work is
  underway even before any child reaches `review/`. Purely mechanical —
  `board-step` is the sole executor, performing the move and commit
  itself; no judgment pass is ever spawned for this step.
- **Spec ready**: once every child is `done/`, move the Spec itself to
  `review/` and commit. Purely mechanical, same as Claim — `board-step`
  is the sole executor; no judgment pass is spawned for this step
  either.
- **Work**: carry a child already sitting in `in-progress/` to a
  terminal state — `review/` once done, or back to `todo/` with a
  `## Flagged` section if it can't be finished. A judgment pass
  (`spec-pass`, mode `work`) is always spawned with this exact ticket
  named, never left to rediscover it.
- **Child review**: decide the child's fate against its own
  `## Acceptance criteria` — fix what's missing or approve outright,
  tick any boxes that now reflect reality, then move it to `done/`. A
  child's review always ends at `done/`, never back for more coding. A
  judgment pass (`spec-pass`, mode `review-child`) is always spawned
  with this exact ticket named.
- **Spec review**: when the item sitting in `review/` is the Spec
  itself, that's `spec-review`'s job, not an ordinary child review — a
  `spec-review` pass is spawned directly, not through `spec-pass`.
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
