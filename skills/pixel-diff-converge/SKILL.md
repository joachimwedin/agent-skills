---
name: pixel-diff-converge
description: Iterate pixel-diff fixes against a design reference until the mismatch converges below a threshold, committing each improvement as it lands — or reports stuck if it can't get there.
argument-hint: "<reference> <repo-path> [route]"
disable-model-invocation: true
---

# Pixel Diff Converge

Drives a live UI toward pixel fidelity with a reference design: repeatedly runs `pixel-diff`, fixes the single worst difference it reports, keeps the fix only once it's measurably helped, and stops when the mismatch **converges** below a threshold — or gives up and reports **stuck** if it can't.

Takes the same reference, repo-path, and route arguments as `pixel-diff` (see its own SKILL.md for what those mean, and how masking non-deterministic content works — that all applies here unchanged), plus two invocation-supplied numbers:
- **threshold** — mismatch percentage to converge below. Default 2%.
- **max-consecutive-failures** — consecutive non-improving attempts before giving up as stuck. Default 15. A successful fix resets this count to 0, so a long run that's mostly succeeding never trips it — only a genuine losing streak does.

## Before starting

This commits directly, repeatedly, as it runs. Get into an isolated branch or worktree first, the same way you would before any change you intend to commit — this skill doesn't do that for you.

## Procedure

1. Run `pixel-diff` (its full procedure) against the reference/repo-path/route. If the reported mismatch is already below `threshold`, stop here: converged, nothing to do.

2. From the report, pick the single worst difference to attempt: the largest `pixelmatch` cluster by mismatched-pixel count, falling back to a solid-fill mismatch only once no `pixelmatch` cluster remains worth attempting. Identify a difference by the DOM selector `pixel-diff` resolves for it, not raw coordinates, so you can recognize one you've already given up on (step 5) across later runs even as coordinates shift, and skip it rather than picking it again.

3. Dispatch one iteration to a fork (Agent tool). Inheriting full context and tools, it reads the difference's DOM selector, compares the live implementation against the reference's markup, CSS, or copy at that point, and implements one targeted fix directly in the working tree — **uncommitted**. Diagnosing and fixing is a fresh judgment call each time (a line-height, a copy string, a color token, a spacing value) — there's no fixed recipe, since the cause varies with the finding.

4. **Measure, then decide** — the fix stays uncommitted through step 3 for exactly this: nothing reaches git until it's proven itself.
   - **`pixelmatch`-cluster target**: re-run `pixel-diff` twice and compare the mean mismatch percentage against the pre-fix mean (re-run the baseline twice too, if you don't already have two samples of it). A single before/after sample isn't trustworthy — screen renders carry their own sub-pixel noise — so count it as improved only if the mean drops by more than 0.3 percentage points; anything smaller is noise, not signal.
   - **Solid-fill target**: re-run the solid-fill pass alone. Improved means that specific cluster no longer appears; its pass/fail isn't percentage-based, so the 0.3-point margin doesn't apply to it.
   - **Improved**: commit the change (one commit, naming the region and the fix). Report back `{ region, before, after, committed: <sha> }`. This resets the consecutive-failure count to 0.
   - **Not improved**: discard the uncommitted change — it was never committed, so there's nothing to revert, only to throw away. Report back `{ region, attempt, failed: true }`. This adds one to the consecutive-failure count.

5. Wait for the fork's result before dispatching the next one — each decision depends on the last. On a failed attempt, retry the *same* difference with a different approach, up to 3 attempts total, before abandoning it (mark it given-up-on, per step 2) and moving to the next-worst difference.

6. Repeat from step 1 — a fresh `pixel-diff` run picks up whatever just changed — until either:
   - **Converged**: mismatch drops below `threshold`.
   - **Stuck**: the consecutive-failure count reaches `max-consecutive-failures` without converging.

## Report

State, in the conversation:
- Converged or stuck, and the final mismatch percentage.
- Every difference attempted, in order: region, outcome (committed, with its sha, or failed), and for a failed-and-abandoned one, how many approaches were tried first.
- If stuck: what's left unresolved, so a person can pick up from there by hand.
