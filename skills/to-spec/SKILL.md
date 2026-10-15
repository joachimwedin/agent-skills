---
name: to-spec
description: Turn the current conversation into a spec that a coding agent implements from in a fresh session, asking about anything the conversation doesn't answer. Use when the user wants the discussion written up as a spec, or after a grill session is confirmed.
---

Turn this conversation into a spec. The source is the conversation, or the topic or path the user passed. Every claim in the spec comes from what the user said or from something you verified in the repo. Nothing is invented.

A spec is **self-contained**: the implementing agent starts with clean context and cannot ask anything. Every answer it needs is in the document. Length is free; ambiguity is not.

## Process

1. **Draft from the conversation.** Fill each section below with what is established. Verify every file, interface and pattern you name.
2. **List the gaps.** A gap is anything a section needs that the conversation doesn't answer. Ask the user about all of them in one numbered list in chat, grouped by section. Write no file until they reply. Questions that depend on another answer go in a second list.
3. **Handle unanswered gaps.** A gap the user skips or can't answer is written as `[NEEDS CLARIFICATION]`, marked blocking or non-blocking. Never fill it with a guess.
4. **Write it** where it goes (below), and say the full path. Name every blocking gap in the reply.

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

Find the agent vault: the path your CLAUDE.md gives for it, otherwise `~/agent-vault/vault` if that exists. If there is one, read its `CLAUDE.md` and write the spec where and how that file says. The vault decides the location, filename, template and front matter.

With no vault, write `<slug>-spec.md` in `$TMPDIR` (or `/tmp`).
