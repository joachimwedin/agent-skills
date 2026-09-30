---
name: conventions-check
description: Checks a repo — or just its current diff — against the conventions it states in its own documents and reports each violation as a structured finding. Read-only: no artifact, no fixing; the caller decides what to do with the findings. Use when asked to check conventions programmatically, or as another skill's convention-compliance gate (e.g. `/implement`'s review pass). For a shareable HTML report instead, use `conventions-report`, which wraps this skill.
---

# Conventions check

Check every rule the repo's convention documents state against the checked scope, and report each violation as a structured finding. The check only reads and reports, exactly like `deep-review`; fixing is a separate job the caller does with what comes back.

Every rule counts the same. Findings are ranked by severity, never by where the rule happens to be written.

Arguments: the repo is the working directory. Scope is either `whole-repo` (default) or `diff` — a diff scope narrows the code checked to the current branch's change set, using the same log+diff definition `deep-review` uses for its own change set. An optional path filter can narrow whole-repo scope further to a module or directory. Rules still come from every applicable document, including ones outside the checked scope.

## 1. Discover

Identify the conventions this project already has. A convention document is any file that states how code here is written, for example `code-conventions.md`, `backend/code-conventions.md`, `CONTRIBUTING.md`, `STYLE.md` or an ADR under `docs/adr`.

1. Search the whole repo, not only the root: find files whose names contain `convention`, `style`, `guideline`, `contributing`, `architecture` or `adr`, plus `CLAUDE.md`, `AGENTS.md` and `docs/`. Grep the docs for "convention" and "rules".
2. Search again beside the code: a nested convention document applies to its own subtree.
3. Follow pointers. A line like "this project follows the `X` skill" or "see [layers.md](...)" names a rule set: load the skill, or read the document in full. When a skill is not listed, read its `SKILL.md` from the skills directory by path.

`deep-review` carries the same discovery step. Edit the two together.

Done when: every convention document is listed with its path. When there are none, stop and tell the caller that no conventions were found.

## 2. Extract the rules

Read each document against [RULE-FORMAT.md](./RULE-FORMAT.md) and write out its rules:

- Number the rules `R1…Rn` in source order (document, then line), each with its verbatim text, source file and line.
- Classify each rule **mechanical** (it has a `check:` hint) or **judgment** (it has none). A skill pointer is one judgment rule.
- Read a document that is not in the format as well as its prose allows, tag its rules **unstructured**.
- Where a nested rule and a root rule address the same thing, the nested rule wins in its subtree; note the overridden root rule and the subtree.

Done when: every rule in every document has a number, a class and a source line.

## 3. Check

**Scope.** In `whole-repo` mode: the files git tracks or would track (not gitignored), minus generated code (generated-source directories, `*.gen.*`, `@generated` headers), vendored code and build output. Tests stay in. A path filter narrows this further. In `diff` mode: the same change set `deep-review` scopes to — the log and diff of everything since the current branch diverged from its base — rather than the whole tracked tree; rule extraction (step 2) still runs whole-repo first, since a convention doc may live outside the diff.

**Modules.** Detect the modules: Gradle modules from `settings.gradle*`, workspaces from `package.json`, `pnpm-workspace.yaml`, Cargo or Go workspaces; failing those, the top-level directories under `src/`, `packages/`, `apps/` or `services/`; failing those, the repo root. Files outside any module form one extra `root` module. A module of more than about 300 files splits by its top-level sub-directories. In `diff` mode, only modules the diff actually touches get a subagent.

**Subagents.** Start one subagent per module, at most 10 running at once, the rest queued. Each gets its module's file list, the rules that apply there (from step 2, with each rule's text, class and, for skill pointers, the skill's text) and this contract:

- Run each mechanical rule's `check:` in the module: a literal command as written, prose turned into a command. Return the command and its exact result.
- Read every file for the judgment rules.
- Return findings as structured data:
  - per rule: `applicable` (places in the module where the rule applies) and `violations`;
  - per violation: file, line, the quoted offending line, and a confidence (`high`, `medium`, `low`);
  - per mechanical rule: the command that ran.
- Every violation quotes its line. A finding with no quote is dropped.

A failed subagent (error, timeout, unusable result) is retried once. When it fails again, the module is reported "not checked" with the reason, and no tally is presented as complete.

Done when: every module in scope has findings or a "not checked" entry.

## 4. Merge

The coordinator computes every number from the returned data and types none by hand.

- Tally violations per rule, per document and overall, plus the modules and files covered.
- Tag a rule **systemic** when `violations` exceed half of `applicable`, with no verdict on whether the code or the document is wrong. Skip the tag where `applicable` was not reported.
- Group findings by rule in source order.

## 5. Report

Call `ReportFindings` once, with one entry per violation, ranked most-severe first: `file`/`line` from the violation, `summary` naming the rule and what's wrong, `failure_scenario` quoting the offending line against what the rule requires, and `category` naming the rule's area. Note in a finding's summary when its rule is tagged systemic — a fixer should treat those as "the rule or the code might be wrong," not a blind find-and-replace.

Never edit code: this skill only reads and reports. After the tool call, add one short status line: rules found, violated rules, modules not checked (if any), documents read as unstructured prose (if any).

Done when: `ReportFindings` has been called and the status line written.
