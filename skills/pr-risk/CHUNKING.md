# Chunking method

A chunk is the smallest set of hunks — possibly spanning more than one file — that would need to be applied together for the code to still compile and its tests to still pass. This is the triggering paper's own definition (Section 4.3): "a set of changes across one or more files that belong together."

## Method

Treat every hunk in the diff as a node. Draw an edge between two hunks when any of these hold:

- They reference the same symbol (function, class, constant) — one defines or changes it, the other calls or depends on it.
- One is in a source file and the other is in that file's matching test (same base name, or an explicit import/reference between them).
- One hunk's changed code imports, calls, or otherwise depends on something the other hunk changed.
- They're adjacent or overlapping regions of the *same* file that clearly implement one coherent change. Don't split a single function's body into two chunks just because the diff rendered it as separate hunks.

Group hunks into chunks by connected components of that graph: every hunk reachable from another through these edges belongs to the same chunk. A file with two unrelated hunks (e.g. an unrelated logging tweak and a real bugfix) with no edge between them becomes two chunks, even though they're in one file. A one-line interface change plus the three call sites it affects across different files becomes one chunk, even though it spans files.

## Worked examples

- Branch touches `UserService.kt` (adds a null check) and `UserServiceTest.kt` (adds the matching test case). One chunk — the test references the changed method.
- Branch touches `Logger.kt` (adds a log line, unrelated to anything else in the diff) and separately fixes an off-by-one in `PricingEngine.kt`, in the same commit. Two chunks — no edge between them.
- Branch renames a function in `api.ts` and updates its three call sites in `handlers.ts`, `routes.ts`, and `api.test.ts`. One chunk, three files.

## When in doubt

If a hunk has no clear edge to anything else, it's its own one-hunk chunk — don't force a connection that isn't there. State the chunk count and composition plainly; don't collapse everything into one "whole diff" chunk just because de-tangling is hard for a particular diff.

## Hub hunks (an end-to-end test touching everything)

An integration/end-to-end test's hunk commonly references symbols from every other chunk in the diff — it's supposed to, that's what makes it end-to-end. Taken literally, the connected-components rule would then transitively merge every chunk it touches into one giant chunk, defeating the entire point of chunking on exactly the diffs where it matters most.

Don't let one hub hunk pull everything together. Compute connected components over all the *other* hunks first, ignoring the hub; then give the hub its own chunk rather than merging it into whichever other chunk it happened to touch first. A hunk earns hub treatment when it references symbols from more than two otherwise-unconnected chunks — below that, treat it as an ordinary edge.
