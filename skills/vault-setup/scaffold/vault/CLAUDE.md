# Writing here

## Where things go

- `projects/<name>/handoffs/` — notes for the next session about unfinished work. `<name>` is the repo name.
- `projects/<name>/research/` — working notes from lookups and comparisons. Expires after 7 days.
- `projects/<name>/plans/` — the current plan for a project: goal, constraints, assumptions, sequence, decisions. Long-lived. `<name>` is the repo name, or the project's kebab-case name when it has no repo.
- `projects/<name>/specs/` — what to build and how to verify it, written so an agent can implement it from a fresh session. Expires 30 days after `updated`.
- `reference/` — stable, maintained how-tos and cheat sheets.
- `scratch/` — anything you can't place. Not authoritative.
- `templates/` — copy from here for new docs. Don't edit.
- `assets/` — images, flat, descriptive filenames.

What a project is and how to work in it belongs in that repo's `CLAUDE.md`, not here.

## Format

- Start every doc from the matching template in `templates/`.
- Front matter needs `title` and `summary` (one line) on every doc.
- Standard markdown links with relative paths. No `[[wikilinks]]`.
- Filenames: lowercase kebab-case.
- One topic per file. Edit an existing doc before creating a new one.
- Make targeted edits, not wholesale rewrites.

## Research

- Needs `researched: YYYY-MM-DD` (the day the research was done) and `sources`.
- Put the conclusion first, then the evidence.
- A research doc whose `researched` date is more than 7 days old is stale. Ignore it: don't read it, cite it or build on it. If you need the topic, research it again.
- Never change `researched` on an old doc without redoing the research.
- Don't browse `research/` folders. Grep `summary:` first, and read only docs the task names.
- Before you finish a task, review your research docs. Promote anything lasting to `reference/`, or note it for the repo's `CLAUDE.md` in a handoff. The rest expires.

## Handoffs

- Name: `YYYY-MM-DD-topic.md`.
- Record what is done, what is half-finished and why, the exact next step, and the branch or commit it applies to.
- One live handoff per piece of work. Update it instead of adding another.
- When you pick up a handoff and finish the work, delete it.
- Check the named branch or commit before you follow a handoff. If it no longer matches, ignore it.

## Plans

- Name: `YYYY-MM-DD-topic.md`. Start from `templates/plan.md`.
- Front matter adds `status` (`draft`, `active` or `superseded`), `size` and `updated`.
- One live plan per project. Update it in place, review log included. When a new plan replaces it, delete the old one.
- Plans don't expire. Read one only when the task names the project or the user asks.
- Link the plan from a handoff while work on it is underway.

## Specs

- Name: `YYYY-MM-DD-topic.md`. Start from `templates/spec.md`.
- Front matter adds `status` (`draft`, `approved`, `implemented` or `superseded`) and `updated: YYYY-MM-DD`.
- Update a live spec in place and bump `updated`. When a new spec replaces it, delete the old one.
- A spec whose `updated` date is more than 30 days old is stale. Ignore it: don't read, cite or build on it.
- Never bump `updated` on a stale spec without re-reading the spec against the code.
- Read a spec only when the task names it or the user asks.

## Reference

- Short and imperative. One topic per file.
- If you find a reference doc is wrong, fix it in place or delete it, in the same session.
- If nobody will maintain it, it doesn't belong here.

## Scratch

- Don't read `scratch/` unless asked.
- Don't put secrets here or anywhere in the vault.

## Rules

- Delete obsolete or duplicated docs. Don't leave stubs or notes saying a doc was removed.
- Ask before deleting more than a few files in one run.
- No secrets, tokens or customer data.
- Don't edit `templates/` or `.obsidian/`.
- The vault has no git history you can use. Don't try to run git here.
