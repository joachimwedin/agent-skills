---
name: deep-review
description: A deep review of a change set (branch, PR or commit range) — the project's own written conventions, correctness, tests and design quality — reporting ranked findings with evidence. Use when asked to review a branch, PR or diff in depth, or when another skill needs a whole-change review.
---

# Deep review

Review a change set in four steps. Each ends on a criterion you can check; report only after the last one.

The review only reads and reports. Fixing, committing and filing work belong to the caller.

## 1. Scope

Read the full log and diff of the change set, then open every changed file, in full unless it is tiny.

Done when: every changed file has been opened.

## 2. Find the conventions

Identify the conventions this project already has, then apply them as review criteria. A convention document is any file that states how code here is written, for example `code-conventions.md`, `backend/code-conventions.md`, `CONTRIBUTING.md`, `STYLE.md` or an ADR under `docs/adr`.

1. Search the whole project repo, not only the root: find files whose names contain `convention`, `style`, `guideline`, `contributing`, `architecture` or `adr`, plus `CLAUDE.md`, `AGENTS.md`, `docs/` and lint or formatter config. Grep the docs for "convention" and "rules".
2. Search again beside the changed code. A nested convention document in a module or directory the diff touches outranks the root one for those files.
3. Follow pointers. A line like "this project follows the `X` skill" or "see [layers.md](...)" names a required rule set: load the skill, or read the document in full. When a skill is not listed, read its `SKILL.md` from the skills directory by path.
4. Where no document covers an area, infer the convention from the surrounding unchanged code (naming, layering, error handling, test style) and mark it inferred. An inferred convention supports a finding but ranks below a written one.
5. Write the list of rule sets found at the top of the review, one line each, tagged written or inferred. When none exist, say so and review against the design standards alone.

`conventions-check` carries the same discovery step. Edit the two together.

Done when: the list is written.

## 3. Review

One pass per lens over every changed file:

- **Conventions**: each changed file against each rule set from step 2. A violation quotes the rule and cites its document. A convention outranks [DESIGN-STANDARDS.md](./DESIGN-STANDARDS.md) where the two conflict.
- **Correctness**: bugs, edge cases and error paths in every changed function.
- **Tests**: the tests verify behavior, and the failure and rejection cases are covered. Follow the project's test rules from step 2.
- **Design**: apply [DESIGN-STANDARDS.md](./DESIGN-STANDARDS.md) in full.

Done when: every changed file has been checked under every lens.

## 4. Report

Rank findings: convention violations and correctness first, then design, then legibility. Each finding gives the location, the rule or reasoning, and a concrete fix. A few high-conviction findings beat a long list of nits.
