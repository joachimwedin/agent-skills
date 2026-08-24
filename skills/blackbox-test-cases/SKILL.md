---
name: blackbox-test-cases
description: Run a multi-agent pipeline that generates exhaustive, zero-tolerance black-box test-case descriptions (Given/When/Then, not code) for a public API's external contract without any case-authoring agent ever reading the implementation — producing a handoff file, one case file per sub-agent, and an index file; never writes runnable tests itself.
disable-model-invocation: true
---

# Zero-Tolerance Black-Box Test Case Generation

Use this skill for an unusually strict, exhaustive black-box test-case sweep over a
public API's contract. This is not "write some reasonable tests" — it is a
zero-tolerance pass against every precondition, postcondition, error path, boundary,
and stateful interaction the API's contract implies, produced by agents that are
structurally forbidden from ever reading the implementation that would let them
cheat.

Above all, this skill should push toward **completeness that is checkable, not
assumed**. Do not accept "I covered the main cases." Every documented contract
clause either has a corresponding test case or is explicitly named as a gap. There
is no third option.

This pipeline deliberately does **not** merge sub-agent output into one list and
does **not** dedupe against existing tests. Every case-generating sub-agent writes
its own file and stands fully behind its own content — completeness- and
quality-checking happens *before* that file is written (self-review inside the
spawn), not afterward by a later stage rewriting or pruning it. The only
downstream artifact is a small index file that points at these sub-agent files;
it never contains case content itself.

## Core Prompt

Start from this baseline:

> Perform an exhaustive black-box test-case sweep of the target API's external
> contract — signatures, documented preconditions/postconditions, error behavior,
> side effects, and stateful/sequencing constraints.
> Derive every case from what a caller can observe, never from how the
> implementation achieves it.
> Be ambitious about coverage: assume every precondition has a violation case,
> every boundary has an edge case, every documented error has a trigger case, and
> every stateful method has at least one interaction case with something else.
> Be extremely thorough and rigorous. Measure twice, cut once — an uncovered
> contract clause is a defect in this skill's output, not a stylistic nit.

## Non-Negotiable Additional Standards

0. **Be ambitious about exhaustiveness.**
   - Do not stop at "happy path plus one error case."
   - For every precondition in the handoff, there must be at least one case that
     violates it. For every documented error, at least one case that triggers it.
     For every boundary implied by a referenced type's constraints (empty
     collection, zero, nil/null, max length, duplicate id, already-deleted entity,
     etc.), a case that sits on it.
   - Assume thin coverage is a defect, not a stopping point.

1. **The implementation is never read by any case-authoring agent — this is
   structural, not a suggestion.**
   - Exactly one sub-agent (Stage 1, the handoff sub-agent) reads implementation
     source. The fan-out and interaction-pass agents work only from text handed
     to them in their own prompt, and must never invoke Read/Grep/Glob/Bash
     against implementation files. The orchestrator may use Glob/Grep only to
     locate the target during target resolution (Pipeline step 1) — it must
     never Read an implementation file's body.
   - The Stage 1 sub-agent itself is restricted by discipline (not tooling) to
     extracting externally-observable facts — signatures, doc comments,
     call-sites, existing test names/comments — never the internal logic of a
     method body. It may read the body to discover a fact but must never describe
     *how* that fact is achieved.

2. **Zero tolerance for tautological cases.**
   - A case that could only have been written by someone who read the
     implementation (references internal naming, mechanism, or "because the code
     does X") is a defect, full stop. There is no later stage to catch this — the
     spawn that writes the case file must self-review and reject/rewrite it
     before the file is ever written.
   - A case whose Given/When/Then just restates the method signature without
     pinning a concrete scenario ("Given valid input, When called, Then it
     works") is equally a defect.

3. **Every case needs concrete values, not placeholders.**
   - "Given a NodeID" is not acceptable if the handoff's Types section defines
     what a NodeID actually is — use a real-shaped example value.
   - Since there is no merge/review stage to catch this afterward, each
     case-generating spawn must self-check for vague Given/When clauses before
     writing its file.

4. **Statefulness and interaction coverage is mandatory, not optional.**
   - If the handoff shows any method with side effects, history/undo semantics, or
     ordering constraints, the interaction-pass agent's output is a required
     output of this pipeline, not a nice-to-have. Skipping it must be justified
     explicitly (single-method target, no state) — never silently dropped.

5. **Existing-test overlap is intentionally not checked by this pipeline.**
   - There is no dedup-against-existing-tests stage. Cases may duplicate
     something already covered by the target's current test suite — that's an
     accepted trade-off for keeping the pipeline simple and each sub-agent's
     output self-contained. The downstream agent that implements runnable tests
     from these cases is responsible for checking the existing suite before
     writing new ones.

6. **Coverage completeness must be a checkable claim, not a vibe.**
   - Since nothing downstream re-checks a sub-agent's work, each fan-out and
     interaction-pass spawn must self-report a coverage checklist in its own
     file's header (see templates below), explicitly naming anything it left
     uncovered. The orchestrator aggregates these self-reports into the index
     file's summary — it does not re-derive coverage from scratch, and it never
     edits case content to fill a gap.

## File Naming

Given a filesystem-safe `<Target>` token derived from the resolved type/module:

- `<Target>.api-handoff.md` — Stage 1 output (orchestrator-written).
- `<Target>.cases.<method-slug>.md` — one per Stage 2 fan-out spawn, written by
  that spawn directly.
- `<Target>.cases.interactions.md` — Stage 2b output, written by that spawn
  directly (omitted if the interaction pass is justifiably skipped).
- `<Target>.blackbox-index.md` — the final pointer file, orchestrator-written.

All are temporary, uncommitted, repo-root files. No `.gitignore` needed.

## Pipeline (Non-Negotiable Sequence)

**You (the orchestrating agent) never read the implementation and never author a
single test case yourself.** Your job is to resolve the target, dispatch every
stage below as an `Agent` spawn, collect only the compact summaries described
below (never rewrite or re-author case content), persist the handoff file
verbatim, and assemble the index file. If you catch yourself writing a
Given/When/Then in your own words, editing a case for wording, or opening an
implementation file "just to check," stop — that is exactly the contamination
this skill exists to prevent.

1. **Resolve the target.** Path and/or free-form description. You may search to
   *locate* files/symbols, but do not read method bodies while doing so. Derive
   the `<Target>` token.

2. **Stage 1 — Handoff sub-agent** (`Agent`, subagent_type `Explore`). Reads the
   implementation and any existing project domain docs (`CONTEXT.md`-equivalent,
   if present), and returns a handoff containing only externally-observable
   contract facts, structured as:
   ```markdown
   ## Types
   ### <TypeName>
   <shape/constraints, valid vs invalid values>

   ## Methods
   ### <Method signature>
   - Preconditions: ...
   - Postconditions / return contract: ...
   - Errors: ...
   - Side effects: ...
   - Sequencing / statefulness notes: ...
   - References: <Type names this method's signature involves>
   ```
   Undocumented items are written down thin, not guessed at or confidence-tagged.
   `Explore` cannot write files, so the orchestrator writes the returned report
   verbatim to `<Target>.api-handoff.md` at the repo root.

3. **Scope preview (informational, non-blocking).** Count method entries, tell
   the user the fan-out size, continue immediately without waiting.

4. **Stage 2 — Fan-out, one `Agent` (subagent_type `general-purpose`) per
   method, in parallel.** Each spawn receives only: the Core Prompt baseline
   above, that method's handoff entry, plus the full `### <TypeName>` entries
   for every type in its `References:` line, plus the file-naming and
   templates below. Explicit instructions:
   - No Read/Grep/Glob/Bash on source files.
   - Produce an exhaustive Given/When/Then/Rationale list covering happy path,
     every precondition violated individually, every documented error, every
     boundary implied by referenced types — per Standard 0.
   - Self-review every case against Standards 2 and 3 before writing anything —
     sharpen or reject vague/tautological cases yourself; there is no later
     stage that will catch it.
   - Write the result **directly** (using its own Write tool) to
     `<Target>.cases.<method-slug>.md`, using the Case File Template below.
   - Return to the orchestrator only a compact summary: file path, total case
     count by category, the self-reported coverage checklist (pass/fail per
     item), and any explicitly named gaps. **Do not return the full case text.**

5. **Stage 2b — Interaction-pass agent**, one `Agent` (subagent_type
   `general-purpose`), the Core Prompt baseline above plus the full handoff as
   input, dedicated to cross-method/stateful sequence cases per Standard 4.
   Same self-review, same direct-write, same compact-summary-only return,
   writing to `<Target>.cases.interactions.md`. Skip only if the handoff has a
   single method with no state — name that justification explicitly in the
   final report if skipped.

6. **Assemble the index.** Using only the compact summaries collected in steps
   4–5 (never the case files' full content), the orchestrator writes
   `<Target>.blackbox-index.md` using the Index File Template below, including
   the Progress checklist section with every file initialized to `0/<n>` (no
   case has been implemented yet at generation time). This is bookkeeping —
   listing files, counts, and self-reported gaps — not authoring or merging
   test-case content, so the orchestrator does this step itself without
   spawning another agent.

## Case File Template

Every Stage 2 / 2b file uses this shape:

```markdown
# <method signature or "cross-method interactions"> — black-box test cases

**Target:** <Target>
**Source handoff:** <Target>.api-handoff.md

## Coverage checklist (self-reported)
- [ ] Every documented precondition has a violation case
- [ ] Every documented error/exception path has a trigger case
- [ ] Every boundary implied by referenced types has a case
- [ ] Side effects / ordering constraints have a case, or are N/A (no state)
- [ ] Every Given/When pins concrete values — no placeholders
- [ ] No case leaks implementation mechanism

**Gaps (explicit):** <name anything left uncovered and why, or "none">

## Cases

### <case name>
- [ ] Implemented
**Category:** happy path | boundary | error | state-sequence
**Given:** ...
**When:** ...
**Then:** ...
**Rationale:** ...
```

Repeat the `### <case name>` block per case. The `- [ ] Implemented` line is the
tracking mechanism described below — it must be the first line under the case
heading, verbatim, so it stays greppable.

## Index File Template

```markdown
# <Target> — black-box test case index

**Generated by:** the `blackbox-test-cases` skill — read that skill's
`SKILL.md` for the full pipeline, file-naming, and status-tracking
conventions this index and its linked case files follow.

**Handoff:** <Target>.api-handoff.md

This file is a pointer index only. It contains no case content — each linked
file is authored independently by its own sub-agent and is the sole source of
truth for its cases. Existing-test overlap was not checked (Standard 5) — the
agent that implements runnable tests from these cases should check the
existing suite itself.

## Progress checklist (authoritative — read this, not the case files)

This checklist is the single place to answer "what's left?". A later agent
should never need to open or grep a case file just to determine status — read
this section only. Whenever a downstream agent flips a case's
`- [ ] Implemented` to `- [x]` in a case file, it must also bump that file's
`Done` count below and check the file's box once `Done == Total`.

- [ ] `<Target>.cases.<method-slug>.md` — <method> (0/<n>)
- [ ] `<Target>.cases.interactions.md` — interaction/stateful cases (0/<n>)

**Overall: 0/<grand total> cases implemented.**

## Status tracking convention

Every case in every linked file starts with `- [ ] Implemented`. When a
downstream agent writes the runnable test for a case:

1. Flip that line to `- [x] Implemented` (optionally appending
   `**Implemented in:** <file>:<line>`) directly in the case file.
2. Update the Progress checklist above in this same index file: bump that
   file's `Done` count, and check its box once `Done == Total`.

Keeping step 2 in lockstep with step 1 is what lets a later agent trust the
checklist instead of re-deriving it from the files. Use grep only to *audit*
the index against the files it points at if you suspect drift — not as the
normal way to check status:

    grep -c '^- \[ \] Implemented' <file>   # pending
    grep -c '^- \[x\] Implemented' <file>   # done

## Method case files
| Method | File | Total | Done | Self-reported gaps |
|---|---|---|---|---|
| <method> | `<Target>.cases.<method-slug>.md` | <n> | 0 | <gap summary, or "none"> |

## Interaction / stateful cases
`<Target>.cases.interactions.md` — <n> cases, 0 done, gaps: <summary, or "none">
(or: "Skipped — <justification>")

## Handoff items with zero cases anywhere
<list any method/precondition/error/boundary no sub-agent claimed, or "none — every
handoff item has at least one case per sub-agent self-report">
```

## Primary Coverage Questions

Every fan-out / interaction-pass spawn must be able to answer yes to each of
these for its own file before writing it, or name the gap explicitly in that
file's header:

- Does every documented precondition have a violation case?
- Does every documented error/exception path have a trigger case?
- Does every boundary implied by a referenced type's constraints have a case?
- If this method has side effects or ordering constraints, is there at least one
  interaction/sequence case involving it?
- Does every Given/When pin concrete values rather than a vague placeholder?
- Could this case only have been written by someone who read the implementation
  body — does its wording leak mechanism rather than contract?

## What to Flag Aggressively

Each spawn flags these in its own file's header (Gaps line); the orchestrator
surfaces them again in the index's final summary:

- A handoff method, precondition, error, or type boundary with zero
  corresponding cases.
- A case that reads like it required implementation knowledge (references
  internal naming, "because the code checks X", algorithmic detail) — this
  should have been caught and fixed by self-review before the file was written.
- A vague Given/When ("valid input", "some value") where the handoff's Types
  section defines concrete constraints that should have been used.
- A stateful or side-effecting method with no interaction-pass case covering it.
- Generic "test that it works" cases standing in for a real boundary or error
  case.

## Preferred Remedies

When a spawn finds a gap in its own coverage, the fix is precision, not
invention:

- Name the exact uncovered handoff clause (precondition/error/boundary) in the
  file's Gaps line — do not paper over it with a vague summary.
- Do not invent behavior not present in the handoff to fill a gap — per
  Standard 1/6, a gap usually means the handoff itself was thin (nothing to
  invent from), and inventing behavior reintroduces exactly the contamination
  this pipeline exists to avoid. Report the gap; let the user decide.
- If a case is vague or tautological, fix it in-spawn before writing the file —
  there is no later stage that will fix it for you.

## Reporting Tone

Be direct and specific in the final summary — this pipeline exists to make
thoroughness checkable, so the report has to actually check it, not just declare
success.

Good phrases:

- `this method has a documented "throws if already connected" precondition with
  zero cases against it — flagged in <Target>.cases.connect.md, not invented.`
- `interaction pass produced 6 cases in <Target>.cases.interactions.md; none
  flagged as gaps.`
- `this handoff entry has no doc comment and no discoverable call-site behavior;
  coverage here is necessarily thin — noted, not guessed.`
- `skipped the interaction pass — this target is a single pure function with no
  state, no sequencing to cover.`

Do not accept a fan-out spawn's summary that just says "coverage looks solid"
without naming what was checked against what.

## Output Expectations

Report to the user, in this order:

1. Any handoff item (method/precondition/error/boundary) left with zero cases
   anywhere, per the sub-agents' self-reports.
2. Total cases generated across all files, broken down by category (happy/
   boundary/error/state-sequence).
3. That existing-test overlap was not checked (Standard 5), and that's by
   design.
4. Any handoff items that were necessarily thin due to missing documentation.
5. All file paths (handoff, each `<Target>.cases.*.md`, and the index), an
   explicit reminder that the output is test-case *descriptions*, not runnable
   code, and a one-line reminder that status is tracked in two lockstep places
   — the `- [ ] Implemented` line in each case file, and the matching row in
   the index's Progress checklist — for whichever agent implements them next.

## Completion Bar

This pipeline's output is not "done" merely because the files got written.
Treat the following as required, not aspirational:

- Every method in the handoff has at least one case, in some `<Target>.cases.*.md`
  file.
- Every documented precondition, postcondition, error, and type boundary has at
  least one case, or is explicitly named as a gap in that case file's header.
- Every stateful/side-effecting method has an interaction-pass case, or the
  absence is explicitly justified (no state exists).
- No case reads as derivable only from implementation knowledge.
- No case has a vague, placeholder Given/When where concrete values were
  available from the handoff's Types section.
- Every case has a leading `- [ ] Implemented` line, verbatim, so downstream
  status tracking works.
- The index's Progress checklist lists every case file with an accurate
  `0/<n>` count at generation time, so a later agent can determine what's left
  without opening any case file.
- The index names the `blackbox-test-cases` skill as its generator, so a cold
  agent that finds these files without this conversation's context knows what
  pipeline and conventions produced them.

Treat any of these as a presumptive defect in the run unless the relevant case
file's header names it and explains why (e.g. "undocumented, coverage
necessarily thin" is an acceptable explanation; "seemed unnecessary" is not).
