# Risk scoring method

A staged/gated pipeline, never a single blended number.

## 1. Structural layer — always on, score every file and every changed line

No git history needed, so this runs identically on a brand-new repo and a ten-year-old one.

- **Blast radius**: how many other files import from or call into the changed file/symbols. Approximate with a grep for the file's exported symbols across the repo if no dependency-graph tool is available.
- **Complexity of the changed region**: cyclomatic complexity of the function(s) actually touched, not the whole file.
- **Patch-coverage gap**: whether the changed lines are exercised by any test in the repo's existing test suite — read the matching test file (if findable) and check whether it calls the changed code path. Approximate; don't require a coverage tool to be installed. State the verdict as a positive sentence either way — never lead with "none" or "n/a" and a dash. "Covered: 10 new Plan.test.ts cases exercise add/remove/replace/gating/duplicate-name" and "Not covered: no test in this diff or the existing suite calls `refreshSession` with an expired token" are both unambiguous on their own; "none — 10 new cases cover ..." reads, out of context, as "no tests," the opposite of what it means.
- **Path-based criticality**: does the path match an auth/payment/migration/deploy/infra pattern (e.g. `auth/`, `payment`, `migration`, `deploy`, `*.sql`, `Dockerfile`, CI config)? This is a bespoke heuristic, not an industry-standard list — state the pattern matched when it fires.

Score each as `high`/`medium`/`low` with the reason; don't collapse these four into one number yet.

## 2. Historical layer — gated, never defaulted

- **Threshold**: a file needs at least 12 prior edits (`git log --follow --oneline -- <file> | wc -l`, from step 1 of the main procedure) before this layer activates. Below 12, skip this layer entirely for that file — don't substitute a midpoint or a "high risk" default.
- Above the threshold: a file changed rarely relative to the repo's own commit count is higher risk than one changed often. State which comparison was used (e.g. "changed twice in 40 commits, bottom decile of change frequency").
- Below the threshold: tag the file `insufficient-history` and say so plainly in the output. This is itself information for the reviewer, not a gap to paper over.

## 3. LLM layer — content findings, never a bare confidence number

Read each chunk's actual code. Report concrete, falsifiable observations: "this calls an API at a version this repo doesn't otherwise use," "no test in this diff or the existing suite exercises this branch," "this pattern doesn't match how error handling works elsewhere in this file." Never report a bare numeric confidence or risk percentage from the model's own self-assessment — that number is measurably framing-dependent and poorly calibrated, and does not carry more real information than silence would.

## 4. Combine

Per file: `overall` risk is the highest of the structural layer's component scores, raised one level further if the historical layer (when active) independently flags it, and accompanied by any LLM-layer findings as supporting reasons, not blended into the number itself. When the historical layer is inactive, `overall` is drawn from the structural layer alone and the file is tagged `insufficient-history` — this is not the same as `unknown`. `unknown` is reserved for a file where even the structural layer couldn't produce a signal (e.g. a generated or binary file).

Every `reason` field (structural sub-scores, `riskPerLine` entries, Judge findings) is a full sentence a first-time reader can act on, not a sentence fragment or a keyword. "Text here, number one line above" is not acceptable; "This date is stored as text, but `expiresAt` on the line above is a number" is. The reader has never heard of this tool's internals and won't ask a follow-up question — the sentence has to carry the whole point on its own.

Per line (inside a chunk): `high`/`medium`/`low`/`unknown`, from the structural layer's complexity/coverage-gap signal for that specific line plus any LLM-layer finding that names that line directly. The historical layer does not operate at line granularity in v1 — git blame-by-line is possible but was deliberately left out; note this as a known gap rather than faking a per-line historical score.
