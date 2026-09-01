---
name: spec-board
description: Render a Spec's board as a markdown status table — one row per ticket, icon-keyed state, blocked/flagged notes. Use when the user wants a snapshot of a Spec's progress, or when track-spec needs the render format.
argument-hint: "<project> <spec-number>"
---

# Spec Board

Invoked with a project and a Spec number: `<project>` names a project
subfolder under `~/repos/agent-tickets/boards/`, `<spec-number>` is
that Spec's own ticket number. Both are required — ticket numbers are
only unique *within* a project (`TICKET-FORMAT.md`: "Specs and their
child tickets share one numbering sequence, independent per project"),
so a bare number alone can't be resolved. If the number doesn't resolve
to a Spec file (`<n>-spec-<slug>.md`) under that project's board, or
the project has no board directory, say so and stop — don't guess at
either.

Scan the board — the four kanban folders under
`~/repos/agent-tickets/boards/<project>/{todo,in-progress,review,done}/`
— the same way `spec-loop`'s own "Scan the board" does: each ticket's
number and slug come from its filename (`<n>-<slug>.md`), its state is
whichever folder it's sitting in, every ticket in `todo/` gets its
`## Blocked by` checked against which folder those referenced tickets
are in, and every ticket gets checked for a `## Flagged` section.

## Render

**Spec #<n> board — <slug>**

| # | Ticket | State |
|---|--------|-------|
| <n> | spec | <icon> <label> |
| <child #> | <child slug> | <icon> <label> |

One row per ticket belonging to this Spec — the Spec itself (`Ticket`
column literally `spec`) first, then every child in ticket-number
order, numbers and slugs read straight off each ticket's own filename.

- **Icon and label**, keyed off the ticket's folder: ✅ done · 🟦
  review · 🟨 in-progress · 🔳 todo. A `## Flagged` ticket overrides
  both, regardless of folder: `🚫 flagged`.
- A `todo` ticket carrying an unresolved `## Blocked by` (and not
  flagged) appends the reason to its normal label instead:
  `🔳 todo (needs #5)`.

Print the table and stop. This skill only reads — it never claims,
dispatches, or moves anything.
