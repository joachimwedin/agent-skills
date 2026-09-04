---
name: comment-guidelines
description: What makes a code comment worth writing versus noise that will rot — a narrow allow-list plus named anti-patterns (narration, changelog comments, caller-listing comments, commented-out code, placeholder spam, AI-voice filler). Use whenever writing, editing, or reviewing code that contains or might contain comments.
---

# Comment guidelines

Default to no comments. Names and structure should carry meaning; add a comment only when the code cannot say something on its own. When one is warranted, keep it to one line — a multi-line block or docstring is reserved for real public API surfaces, not internal code.

## What earns a comment

Only these justify the cost of a comment that can go stale:

- **Why, not what.** A design trade-off or intent that isn't visible in the code itself.
- **Workarounds.** A fix for an external bug or platform quirk — without a note, someone will "clean up" the workaround and reintroduce the bug.
- **Non-obvious constraints.** A business or regulatory rule the code can't make self-evident.
- **Warnings.** The consequence of changing this code, when it's a landmine.

If a comment would only restate what a good name or a smaller function could already say, do that instead of writing the comment.

Public API documentation for external consumers is a different, more justified category with its own conventions — the one-line cap above applies to inline explanation, not to docstrings written for callers outside the file.

## Anti-patterns

Each of these is a comment that duplicates something the reader — or the codebase itself — already has a better source for. That's what makes them rot: nothing forces them to stay true.

**Narration.** A comment for nearly every line, restating the statement below it (`// increment i` above `i++`). Comment where the logic is non-obvious, not on every line.

**Changelog comments.** `// fixed bug per #123`, `// added this for the new feature`, `// changed from X to Y`. This is edit history, and edit history has an authoritative home already: the commit message. A comment in the file should describe the code as it stands now, not how it got here.

**Caller-listing comments.** `// Called by CheckoutController.submitOrder() and by the nightly InventorySync.reconcileStock() job` above a function signature. This describes the function's callers instead of its contract — information that belongs to the caller, not the callee, and that "find references" answers correctly forever while the comment answers correctly only until the next caller is added or removed. Document what the function does and guarantees; leave who calls it to the tools built for that question.

**Commented-out code.** Delete it. Version control already remembers it, correctly and permanently — a comment doesn't.

**Placeholder spam.** A `TODO`/`FIXME` with no tracked task behind it is a note to no one. Only leave one if it's tied to something real.

**AI-voice filler.** Hedging, throat-clearing, or a comment that doesn't read like a colleague wrote it. Say the one true thing and stop.
