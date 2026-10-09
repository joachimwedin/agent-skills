---
name: pr-report
description: Renders a branch's diff as a three-level trust-calibration HTML report — overview walkthrough, file-level risk, and chunk-level Judge review — applying the workflow from "Trust-Calibrated Code Review: A Participatory Design Study of Review Workflows for LLM-Generated Multi-File Changes" (LIPIcs.ESEM.2026.89, ESEM 2026). Use when asked to review a branch or PR with risk/trust signals surfaced, not just a plain diff.
argument-hint: "<branch>"
---

# PR report

Produces the artifact a human reviewer actually reads: a three-level drill-down (overview → file → chunk) rendering the trust-calibration constructs from the triggering paper, built from `pr-walkthrough`'s narrative and `pr-risk`'s chunk/risk/Judge data.

Takes exactly one argument: a branch name. Stop and ask for one if it's missing; don't default to the current branch.

## 1. Gather

Run [`pr-walkthrough`](../pr-walkthrough/SKILL.md) in full, exactly as written, on the same branch — take its narrative text and its commit-list JSON exactly as printed.

Run [`pr-risk`](../pr-risk/SKILL.md) in full, exactly as written, on the same branch — take its JSON object exactly as printed. Don't recompute or re-derive any risk score, chunk boundary, or Judge verdict; this skill only presents what those two already produced.

Done when: both have been run and both outputs are in hand.

## 2. Render

Copy [TEMPLATE.html](./TEMPLATE.html) verbatim — don't hand-author HTML from prose, the template is the source of truth for the design (see [DESIGN.md](./DESIGN.md) for its rationale). Build one JSON object:

```json
{ "branch": "<branch>", "base": "<default-branch>", "narrative": "<pr-walkthrough's text>", "commits": <pr-walkthrough's commit-list array>, "files": <pr-risk's files array>, "chunks": <pr-risk's chunks array> }
```

Replace the `__PR_DATA__` placeholder inside the template's `<script type="application/json" id="pr-data">` block with this object, verbatim — don't recompute or restate any field from `pr-walkthrough` or `pr-risk`'s own output while assembling it. Every number the page displays (file count, chunk count, risk badges, verdicts) is computed client-side from this object; nothing is typed into the template by hand.

**Destination:** read this session's own persistent user instructions (the global `CLAUDE.md`, or equivalent) for a documented personal notes/scratch directory the user has set up for agent output — write to a `scratch`-style subdirectory of it if that convention is documented there, `pr-report-<branch>-<timestamp>.html`. If none is documented, write to the OS temp dir instead (`$TMPDIR`, falling back to `/tmp`; `%TEMP%` on Windows).

Do not open the file. Report its absolute path, plus the same one-line tally `pr-risk` already printed (chunks, files, files tagged `insufficient-history`, Judge verdict counts) — the `insufficient-history` count is operational information for you and the user in chat even though the rendered page itself doesn't call that status out visually (see DESIGN.md).

Done when: the file exists and its path has been reported.
