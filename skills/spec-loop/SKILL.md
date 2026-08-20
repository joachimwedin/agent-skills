---
name: spec-loop
description: Drive a Spec's board on agent-tickets to completion — spawn a fresh subagent to run spec-pass, one action at a time and never in parallel, until the board can't be progressed any further.
disable-model-invocation: true
---

# Spec Loop

Invoked with a Spec (number or path). Loops `spec-pass` over that
Spec's board, one subagent per action, until nothing's left it can
progress.

## Loop

Spawn a subagent (Agent tool, one at a time — never in parallel)
instructed to invoke `spec-pass` on this Spec. It has no memory of
this conversation, so hand it the Spec's number or path directly, and
have it report back exactly what happened.

Narrate that outcome before spawning the next subagent — e.g. "claimed
and coded #12", "resolved #9 in review", "moved the Spec to review/",
"ran spec-review — reopened with 2 new child tickets".

Anything except `done` or `blocked` is forward progress — including
moving the Spec to `review/` and running `spec-review`, whether that
reopens the Spec or closes it out — spawn the next subagent the same
way, however many times that takes. There's no cap on how many times a
Spec can cycle back through `spec-review`.

## Consecutive-failure circuit breaker

If a subagent's call errors out with no report at all, retry once
immediately with the same briefing. If the retry also errors, stop the
loop and report the failure instead of continuing.

## Report

State the board's final outcome:

- `done` — the Spec reached `done/`.
- `blocked` — say why, per the last subagent's report.
- Stopped after a repeated technical failure — say what the error was.
