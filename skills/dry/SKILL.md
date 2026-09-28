---
name: dry
description: Don't Repeat Yourself — a single, authoritative representation for each piece of knowledge in the system. Use when writing or reviewing code that duplicates logic, or when deciding whether to extract a shared abstraction from similar-looking code.
---

# DRY

Every piece of knowledge — a business rule, a validation, a schema, a fact — has one authoritative representation in the system. DRY is about the *knowledge*, not the text that happens to express it.

## Knowledge, not text

Two blocks of code that read identically today are not automatically a DRY violation. Two blocks that read differently but encode the same fact are. Apply the **reasons-to-change test**: if changing one would force you to change the other to keep the system correct, they're duplicated knowledge — merge them. If a change to one plausibly wouldn't touch the other, they're only coincidentally similar — leave them alone, even if today's text matches byte for byte.

## When not to merge

Forcing two coincidentally-similar blocks into one abstraction produces a wrong abstraction: the merged code doesn't quite fit both callers, so it grows a flag or a branch to cope — and ends up worse than the duplication it replaced. Prefer duplication over a wrong abstraction; the fastest way out of one is usually back to two.

- If merging needs a new parameter or conditional to paper over a difference, that's a rejection signal, not a green light.
- Two similar blocks visible in the same diff are not evidence of shared knowledge — that's an artifact of what you're looking at right now, not a fact about the domain.
- Coupling has a cost too: merging makes every caller depend on the shared code, so weigh that against the cost of the duplication it removes.

## Rule of three

The first occurrence: write it. The second: duplicate it, even though it itches — two data points can't yet tell you whether the similarity is real. The third: you likely have enough shape to extract correctly. Extract earlier only when you can name, in one sentence, the exact piece of knowledge every instance represents.

## The two failure modes to watch for

Left unprompted, it's easy to both under- and over-deduplicate, often in the same piece of work:

- **Duplicating by default.** Asked to change one thing, the reflex is to write a fresh copy with the change rather than find and reuse what already exists. Search for an existing implementation before writing a new one — but confirm it represents the same knowledge before reusing it.
- **Over-abstracting on sight.** The moment two similar-looking blocks are both in view, the reflex is to extract a shared helper immediately — textual co-presence, not a real relationship in the domain. Judge duplication by whether the two pieces share an owner and a reason to change, not by whether they're both on the screen right now.

## Heuristics

- **Name the knowledge before extracting.** State in one sentence the single fact, rule, or invariant every instance represents. Can't name one → it's coincidence, not duplication.
- **Apply the reasons-to-change test**, not the looks-the-same test.
- **Tolerate duplication at two call sites; extract at a genuine third**, and only if the shared shape doesn't need bending.
- **A merge that needs a new flag or branch to fit its callers is the wrong abstraction** — undo it, inline back to each caller, re-derive later once the real shape is clear.
- **Don't extract just because two blocks are visible in the same diff.** Judge by domain relationship, not textual co-presence.
- **Prefer a small function over a class hierarchy** when deduplicating — a wrong function is cheap to undo, a wrong hierarchy accretes overrides and flags.
- **Search for and reuse existing code before writing new logic**, once you've confirmed it's the same knowledge, not merely a same-looking need.
- **Check past source.** A rule duplicated across code and docs, or a schema duplicated across a migration and a type, is the same violation as duplicated code — DRY isn't code-only.
- **State the call when it's close.** "Extracted: both enforce the same rule, confirmed by a third caller" or "left duplicated: same shape, different owners, no shared trigger" — make the judgment checkable.

## Anti-patterns

- **Wrong abstraction.** A shared function or class bent with flags and branches to fit callers that don't actually share knowledge.
- **Coincidental merge.** Unifying code because it looks the same today, not because it represents one fact.
- **Blind duplication.** Writing a new copy of existing logic instead of finding and reusing it.
- **Cross-representation drift.** The same rule stated independently in code, schema, and docs, free to go out of sync.
