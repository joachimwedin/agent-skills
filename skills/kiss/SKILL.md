---
name: kiss
description: Keep It Simple — match a solution's complexity to the problem it actually solves, no more and no less. Use when writing or reviewing code that adds an abstraction, a config option, a new layer, a design pattern, or any structure not required by a caller that exists today.
---

# KISS

Keep a system as simple as it can be while it still does its job: not the fewest lines, not the least effort — the least complexity the problem actually demands.

## Simple is not easy

Simple and complex describe *structure*: how many parts, how entangled. Easy and hard describe *effort right now*: familiarity, typing speed. The two are independent. The familiar path — reach for the framework you know, copy a pattern from elsewhere, add a flag instead of asking whether it's needed — is often easy and complex at once. Choose simple over easy when they conflict: simple compounds into speed later, easy-first complexity compounds into slowdown later.

## What KISS is not

- **Not fewest lines.** A golfed one-liner that takes longer to parse than three named steps is not simpler.
- **Not zero abstraction.** An abstraction earned by a real, current need is simplifying. KISS forbids the *unjustified* one, not all of them — pair with `dry`'s rule of three for when an abstraction is earned.
- **Not skipping correctness.** Dropping error handling, validation, or a reachable edge case isn't simple, it's broken. Simplicity is measured against the problem the code must actually solve.

## Signals of overbuilding

- Speculative generality: a strategy/plugin/provider abstraction, or a config flag, for a variation nobody has asked for.
- An abstraction (interface, base class, factory) introduced after seeing a pattern once, before its real shape is known.
- A layer, wrapper, or manager whose removal wouldn't lose any behavior, just a hop.
- A function you can't summarize in one sentence, with more than ~10 independent branches, or nested more than 2-3 levels.
- Restructuring a path with no measured bottleneck.
- Reaching for a named design pattern or a new dependency because it's the "proper" way, not because the problem demands it.

## Signals of underbuilding

Cutting simplicity's corners can look like KISS and isn't:

- Missing handling for a failure mode the code will actually hit: a network call, a parse of untrusted input, a case the type doesn't rule out — see `negative-space` for the line between a bug and an expected failure.
- No single-sentence answer to "what happens when this fails or is missing?" for an input the code accepts.

## Heuristics

- **No abstraction on the first sighting.** One occurrence is a data point, not a pattern. Inline it; extract only once a genuine need recurs (see `dry`'s rule of three).
- **Name today's caller.** If you can't point at the concrete caller or requirement that needs an abstraction, option, or layer right now, don't add it.
- **A 3+ branch conditional over similar-looking cases is a signal to look at the data, not the control flow** — a lookup or dispatch only if the branches are truly parallel; otherwise leave them explicit.
- **State the bottleneck before optimizing.** No measured hot path, no restructuring for performance.
- **Prefer the standard library and what's already in the codebase** over a new dependency or a new pattern.
- **Distinguish load-bearing handling from padding.** Keep handling for calls that can fail and input that isn't already type-guaranteed; cut catch-alls around code that structurally can't throw.
- **If you can't explain an abstraction's payoff to its caller in one sentence, inline it.**
- **Before finishing, re-read your own diff for anything added "just in case."** Remove what you can't justify against a concrete requirement.

## Anti-patterns

- **Speculative generality.** A config or plugin point for a variation that doesn't exist yet.
- **Premature abstraction.** Generalizing from a single instance.
- **Indirection for its own sake.** A layer whose deletion loses nothing but a hop.
- **Clever over clear.** Code optimized for compactness at the cost of a reader's mental model.
- **Defensive padding.** Handling for a state the type system or contract already rules out.
- **Framework or pattern reflex.** Reaching for a named pattern because it's "proper," not because the problem needs it.
