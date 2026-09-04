---
name: comment-guidelines
description: What makes a code comment worth writing versus noise that will rot — a narrow allow-list plus named anti-patterns (narration, changelog comments, caller-referencing comments, commented-out code, placeholder spam, AI-voice filler). Use whenever writing, editing, or reviewing code that contains or might contain comments.
---

# Comment guidelines

Default to no comments. Names and structure should carry meaning; add a comment only when the code cannot say something on its own. When one is warranted, keep it to one line, written as a plain `//` (or your language's equivalent) — the exception is a real public API surface (see below), which is documented with the language's doc-comment form instead.

## What earns a comment

Only these justify the cost of a comment that can go stale:

- **Why, not what.** A design trade-off or intent that isn't visible in the code itself.
- **Workarounds.** A fix for an external bug or platform quirk — without a note, someone will "clean up" the workaround and reintroduce the bug.
- **Non-obvious constraints.** A business or regulatory rule the code can't make self-evident.
- **Warnings.** The consequence of changing this code, when it's a landmine.

If a comment would only restate what a good name or a smaller function could already say, do that instead of writing the comment.

## Public API

A declaration that another repo, layer, or process consumes across a boundary — an HTTP/REST endpoint handler, a published library's public surface, a CLI command — is a different, more justified category with its own conventions. Document it with the language's doc-comment form (KDoc/Javadoc's `/** */`, JSDoc, a Python docstring, and so on) instead of a plain `//`; the one-line cap above doesn't apply to it either. Everything else keeps the default — a one-line `//`, even a private helper sitting directly above a function or class.

## Anti-patterns

Each of these is a comment that duplicates something the reader — or the codebase itself — already has a better source for. That's what makes them rot: nothing forces them to stay true.

**Narration.** A comment for nearly every line, restating the statement below it (`// increment i` above `i++`). Comment where the logic is non-obvious, not on every line.

**Changelog comments.** `// fixed bug per #123`, `// added this for the new feature`, `// changed from X to Y`. This is edit history, and edit history has an authoritative home already: the commit message. A comment in the file should describe the code as it stands now, not how it got here.

**Caller-referencing comments.** Naming a specific caller instead of documenting the callee's own contract — whether it lists several, `// Called by CheckoutController.submitOrder() and by the nightly InventorySync.reconcileStock() job`, or just one, `// Independently fetchable — the frontend's /bostad/:id route never has to go through /api/search first`. Either way, this is information that belongs to the caller, not the callee: "find references" answers it correctly forever, while the comment answers correctly only until that caller changes — worse yet when the caller sits in another repo or layer, where "find references" can't even reach, so nothing will ever catch the comment going stale. Fix it by stating the contract, not who currently exercises it: the second example above becomes `// Independently fetchable — does not require a prior list call`.

**Commented-out code.** Delete it. Version control already remembers it, correctly and permanently — a comment doesn't.

**Placeholder spam.** A `TODO`/`FIXME` with no tracked task behind it is a note to no one. Only leave one if it's tied to something real.

**AI-voice filler.** Hedging, throat-clearing, or a comment that doesn't read like a colleague wrote it. Say the one true thing and stop.
