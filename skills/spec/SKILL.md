---
name: spec
description: What goes into a spec that a coding agent implements from in a fresh session, and where it is written. Use when writing, editing or reviewing a spec, or when another skill needs the spec format.
---

A spec is **self-contained**: the implementing agent starts with clean context and cannot ask anything. Every answer it needs is in the document. Length is free; ambiguity is not.

## Sections

Write these, in order.

1. **Problem and why now**: one concrete story of who is affected and what goes wrong today.
2. **Scope and non-goals**: what is in, and what is deliberately out.
3. **Approach**: the constraints the agent cannot infer from the code. Name the files, interfaces and existing patterns to follow, and verify each one exists before naming it.
4. **Decisions**: each with its reason and the alternative rejected, so the implementer does not re-litigate it. Only choices the user made belong here.
5. **Assumptions**: defaults accepted without discussion, each marked `default accepted` or `user-chosen`, so nobody mistakes an accepted default for a decision.
6. **Acceptance criteria**: independent, testable statements of the result, not the recipe. Behaviour is written as Given/When/Then scenarios, including edge and negative cases. The last criterion is an end-to-end check, with the exact command or steps, that proves the feature works.
7. **Open questions and risks**: each open question marked `[NEEDS CLARIFICATION]` and blocking or non-blocking. A risk says what could go wrong and what would show it.

## Writing it

- Every goal maps to a check the agent can run.
- Use the project's own terms (its `CONTEXT.md`, if it has one).
- Leave out what the agent reads from the code: repo overviews, file-by-file descriptions, task breakdowns.
- Describe the implementation only as far as a decision or constraint requires. The agent plans the rest.

## Where it goes

Write to the agent vault when `/Users/joachim-daisy/agent-vault/vault` exists, following the vault's own `CLAUDE.md`. Otherwise write `<slug>-spec.md` in `$TMPDIR` (or `/tmp`). Say the full path in the reply.
