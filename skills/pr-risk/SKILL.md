---
name: pr-risk
description: Computes chunk boundaries, per-file and per-line risk, and a per-chunk Judge verdict for a branch's diff against the repo's default branch — the File-Analysis and Code-Snippet-Review constructs from "Trust-Calibrated Code Review" (LIPIcs.ESEM.2026.89). Use standalone for a risk/defect breakdown of a branch, or as `pr-report`'s File-Analysis and Code-Snippet-Review input.
argument-hint: "<branch>"
---

# PR risk

Breaks a branch's diff into independently-applicable chunks, scores risk per file and per line, and runs an AI Judge pass per chunk. Read-only: no fixing, no comments posted, no code changed. Does not invoke `code-review` or any other reviewer skill — this is its own, independent analysis.

Takes exactly one argument: a branch name. Stop and ask for one if it's missing; don't default to the current branch.

## 1. Scope

Same lookup as `pr-walkthrough`: default branch via `git symbolic-ref refs/remotes/origin/HEAD` (fallback `main`), confirm the named branch exists (`git rev-parse --verify`), then `git log <default>..<branch> --oneline` and `git diff <default>..<branch>`.

Also record, for every file the diff touches, its total historical edit count (`git log --follow --oneline -- <file> | wc -l`), and the branch's own total commit count (`git rev-list --count <default>..<branch>` for the branch's contribution, plus `git rev-list --count HEAD` for repo-wide depth). Both numbers feed the historical-risk gate in step 3.

Done when: every changed file is listed with its historical edit count, and the repo's total commit count is recorded.

## 2. Chunk

One pass over the *whole* diff, not per file. Read [CHUNKING.md](./CHUNKING.md) for the grouping method, then propose a chunk partition: each chunk is the smallest set of hunks — possibly across files — that would need to be applied together for the code to still compile and its tests to still pass. A chunk may span multiple files (e.g. an implementation change and its matching test); a single file's diff may split into more than one chunk when it contains clearly unrelated changes.

Keep each hunk's raw diff text (its `@@ ... @@` header through its last context/added/removed line) verbatim from `git diff`'s own output as you assign it to a chunk. Don't paraphrase or reconstruct it from memory when assembling the Output section below — a reviewer reads this text directly.

Done when: every hunk in the diff belongs to exactly one chunk.

## 3. Score risk

Read [RISK-SCORING.md](./RISK-SCORING.md) for the full method before scoring anything. In short, a staged/gated pipeline, never one blended number:

1. **Structural layer (always on):** blast radius, cyclomatic complexity of the changed region, patch-coverage gap, path-based criticality. Score every changed file and every changed line.
2. **Historical layer (gated):** only for a file whose historical edit count (from step 1) is at or above the threshold in RISK-SCORING.md. Below it, omit the term — tag the file `insufficient-history`, never default it to a score.
3. **LLM layer:** read each chunk for concrete, content-grounded risk factors (unfamiliar framework, no test exercises this path, version/API mismatch) — never produce a bare numeric confidence in place of a missing structural or historical term.
4. Combine per RISK-SCORING.md's staged rule into a per-file risk level (`high`/`medium`/`low`/`unknown`) and a per-line risk level for lines inside each chunk.

Done when: every changed file and every changed line inside a chunk has a risk level and the reasoning behind it.

## 4. Judge

For each chunk, read its hunks in full and report:

- a verdict (`red`/`yellow`/`green`) for likely bugs, security issues, and factual/version mismatches,
- the concrete finding behind any `red` or `yellow` verdict — what's wrong, where, and why, each tagged `high`/`medium`/`low` severity. A verdict with no finding behind it is not allowed.
- `green` explicitly when nothing is wrong, with no finding forced to justify the pass.

Done when: every chunk has a verdict, and every non-green verdict has at least one concrete finding.

## Output

Assemble and print one JSON object, fenced in a ```json block, matching this shape:

```json
{
  "branch": "<branch>", "base": "<default-branch>",
  "historyDepth": { "repoCommits": 0, "threshold": 12 },
  "files": [
    {
      "path": "...", "historicalEdits": 0,
      "risk": {
        "overall": "high|medium|low|unknown",
        "structural": { "blastRadius": "...", "complexity": "...", "coverageGap": "...", "pathCriticality": "..." },
        "historical": { "status": "scored|insufficient-history", "churn": "..." }
      }
    }
  ],
  "chunks": [
    {
      "id": "chunk-1", "summary": "...", "files": ["..."],
      "hunks": [{ "file": "...", "startLine": 0, "endLine": 0, "diff": "@@ -a,b +c,d @@\n context line\n-removed line\n+added line\n context line" }],
      "riskPerLine": [{ "file": "...", "line": 0, "risk": "high|medium|low|unknown", "reason": "..." }],
      "judge": {
        "verdict": "red|yellow|green",
        "findings": [{ "severity": "high|medium|low", "summary": "...", "file": "...", "line": 0 }]
      }
    }
  ]
}
```

`hunks[].diff` is the **raw unified-diff text** for that hunk, verbatim from `git diff`'s own hunk header (`@@ ... @@`) through its last context/added/removed line — not a paraphrase, not just the line range. This is the actual content a reviewer reads; everything else in the chunk (risk, findings) annotates it, never replaces it. `riskPerLine[].line` is the line number in the **new** file (the right-hand side of the hunk header, `+c,d`), since that's what the rendered diff numbers against.

Follow it with a one-line tally: chunks, files, files tagged `insufficient-history`, and the Judge verdict counts (red/yellow/green).

When invoked as part of `pr-report`, this JSON object becomes the File-Analysis and Code-Snippet-Review levels verbatim — reused as written, not re-derived.

Done when: the JSON object matches the shape above and the tally line is printed.
