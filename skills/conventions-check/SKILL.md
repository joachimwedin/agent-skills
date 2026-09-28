---
name: conventions-check
description: Checks a whole repo against the conventions it states in its own documents and writes an HTML report of violations per rule, plus candidate conventions nobody has written down. Read-only. Use when asked to audit, check or measure a repo's conformance with its code conventions, or to find out where the code and its convention documents disagree.
---

# Conventions check

Check every rule the repo's convention documents state against the whole codebase, and report per rule how well the code follows it. The check only reads and reports; fixing is a separate job the person starts.

Every rule counts the same. The report orders findings by where the rule is written, never by importance.

Arguments: the repo is the working directory; an optional path filter narrows the code checked (a module or directory). Rules still come from every applicable document, including ones outside the filter.

## 1. Discover

Identify the conventions this project already has. A convention document is any file that states how code here is written, for example `code-conventions.md`, `backend/code-conventions.md`, `CONTRIBUTING.md`, `STYLE.md` or an ADR under `docs/adr`.

1. Search the whole repo, not only the root: find files whose names contain `convention`, `style`, `guideline`, `contributing`, `architecture` or `adr`, plus `CLAUDE.md`, `AGENTS.md` and `docs/`. Grep the docs for "convention" and "rules".
2. Search again beside the code: a nested convention document applies to its own subtree.
3. Follow pointers. A line like "this project follows the `X` skill" or "see [layers.md](...)" names a rule set: load the skill, or read the document in full. When a skill is not listed, read its `SKILL.md` from the skills directory by path.

`deep-review` carries the same discovery step. Edit the two together.

Done when: every convention document is listed with its path. When there are none, stop and tell the person that no conventions were found.

## 2. Extract the rules

Read each document against [RULE-FORMAT.md](./RULE-FORMAT.md) and write out its rules:

- Number the rules `R1…Rn` in source order (document, then line), each with its verbatim text, source file and line.
- Classify each rule **mechanical** (it has a `check:` hint) or **judgment** (it has none). A skill pointer is one judgment rule.
- Read a document that is not in the format as well as its prose allows, tag its rules **unstructured**, and list the document under "documents to restructure".
- Where a nested rule and a root rule address the same thing, the nested rule wins in its subtree; note the overridden root rule and the subtree.

Done when: every rule in every document has a number, a class and a source line.

## 3. Check

**Scope.** Take the files git tracks or would track (not gitignored), minus generated code (generated-source directories, `*.gen.*`, `@generated` headers), vendored code and build output. Tests stay in.

**Modules.** Detect the modules: Gradle modules from `settings.gradle*`, workspaces from `package.json`, `pnpm-workspace.yaml`, Cargo or Go workspaces; failing those, the top-level directories under `src/`, `packages/`, `apps/` or `services/`; failing those, the repo root. Files outside any module form one extra `root` module. A module of more than about 300 files splits by its top-level sub-directories.

**Subagents.** Start one subagent per module, at most 10 running at once, the rest queued. Each gets its module's file list, the rules that apply there (from step 2, with each rule's text, class and, for skill pointers, the skill's text) and this contract:

- Run each mechanical rule's `check:` in the module: a literal command as written, prose turned into a command. Return the command and its exact result.
- Read every file for the judgment rules.
- Return findings as structured data:
  - per rule: `applicable` (places in the module where the rule applies) and `violations`;
  - per violation: file, line, the quoted offending line, and a confidence (`high`, `medium`, `low`);
  - per mechanical rule: the command that ran.
- Return `candidates` too: consistent patterns in the module that no rule states, each with occurrences, comparable sites, two or three example `file:line`, and a draft rule in the RULE-FORMAT.md format.
- Every violation quotes its line. A finding with no quote is dropped.

A failed subagent (error, timeout, unusable result) is retried once. When it fails again, the module is reported "not checked" with the reason, and no tally is presented as complete.

Done when: every module has findings or a "not checked" entry.

## 4. Merge

The coordinator computes every number from the returned data and types none by hand.

- Tally violations per rule, per document and overall, plus the modules and files covered.
- Tag a rule **systemic** when `violations` exceed half of `applicable`, with no verdict on whether the code or the document is wrong. Skip the tag where `applicable` was not reported.
- Group findings by rule in source order.
- Merge candidate patterns across modules. Keep a candidate only when it holds at about 90% of its comparable sites, at least 5 occurrences, and no stated rule already covers it.

## 5. Report

Write the HTML report per [HTML-REPORT.md](./HTML-REPORT.md) to `<tmpdir>/conventions-check-<timestamp>.html`, with the temp dir from `$TMPDIR`, falling back to `/tmp` (`%TEMP%` on Windows). Open it (`xdg-open` on Linux, `open` on macOS, `start` on Windows), then tell the person the absolute path and the headline tally: rules, violated rules, violations, modules not checked, documents to restructure.

Done when: the file exists and its path has been reported.
