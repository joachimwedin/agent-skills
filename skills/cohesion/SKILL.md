---
name: cohesion
description: Cohesion — the members of a module or class belong together because they share data or jointly accomplish one purpose, not because they were filed under the same name. Use when several functions in a module all take the same parameter (a data clump), when a class's methods don't obviously need each other, when deciding whether to combine loose functions into a class, or when a module's contents are grouped by category or by when they run rather than by what they share.
---

# Cohesion

A module (function, class, or file) is cohesive when its members belong together because they operate on the same data or jointly accomplish one well-defined purpose. Low cohesion isn't a missing abstraction — it's usually a wrong one already in place: a `utils.ts`, a `Helpers` class, a module-level grab-bag that holds things which don't actually depend on each other, just because they were convenient to put in the same place.

## The spectrum, concretely

Worst to best:

- **Coincidental** — grouped for no reason: a `utils.ts` that collects whatever didn't fit elsewhere.
- **Logical** — grouped by category and dispatched by a flag or type tag: `handle(kind, payload)` with a switch over cases that share a name but no mechanism.
- **Temporal** — grouped by *when* they run: `initializeEverything()` wiring up logging, config, and a DB connection because they all happen at startup, not because any one needs another's result.
- **Procedural** — grouped because they're steps of one procedure, with only light data sharing between steps.
- **Communicational** — grouped because every member reads or writes the same data. (good)
- **Sequential** — grouped because one member's output is the next member's input. (good)
- **Functional** — every member exists to accomplish one single, well-defined purpose. (best)

An agent doesn't need to classify real code precisely on a seven-point scale. The actionable split is two-sided: *coincidental / logical / temporal* means "grouped by accident, category, or clock" — a smell worth fixing. *Communicational / sequential / functional* means "grouped by shared data or shared purpose" — leave it, or move more things toward it.

## The tell: a data clump

The concrete signal that should make you look at a module's cohesion at all: the same parameter, or the same group of parameters, repeated across several function signatures in that module. If `sandboxExists(name)`, `createSandbox(name, env, mounts)`, `copySandboxFile(name, ...)`, `writeSandboxSettings(name, ...)`, and `runSandbox(name, ...)` all take `name: string` first, that's not five independent functions that happen to need a name — it's one implicit object (a sandbox) whose identity is being re-passed by hand at every call. The same tell applies to a factory function that closes over several pieces of state to hand back a bundle of related callbacks — the closed-over state *is* the clump, just captured instead of passed.

Quick check: delete one of the repeated parameters from every signature. If the remaining ones stop making sense on their own, it's a clump, not a coincidence.

## The fix — and the overcorrection to avoid

Combine the functions into a class: capture the clump once (constructor or closure), let every method reference it as `this.name` instead of re-accepting it. Put the responsibility on the thing that already holds the data it needs — this moves the grouping from logical/temporal toward communicational or functional cohesion. A test-fixture factory with the same closed-over-state smell gets the same fix: turn it into a small class instead of a function returning a bundle of closures.

Don't force a grouping that doesn't actually exist yet. Two functions that happen to both take a `name: string` today aren't automatically a clump — check whether they *reason about the same entity*, not whether their signatures look alike. Textual similarity in parameter lists is not evidence of a shared concept, any more than two similar-looking code blocks are evidence of shared knowledge. If combining them into a class would need a constructor flag or an optional field that only some methods use, that's a sign the grouping is premature, not a fix to force through.

## Heuristics

- **Name the shared thing before grouping.** State in one sentence what data or purpose every member has in common. Can't name one → it's coincidental, logical, or temporal, not a real unit.
- **A repeated parameter (or parameter group) across a module's functions is the trigger to check cohesion**, not just a style nitpick — it usually means an object is missing.
- **Delete-one-parameter test.** Remove a suspected clump member from every signature; if the rest stop making sense alone, it's a clump.
- **Prefer "combine functions into a class" (or a closure capturing shared state) over leaving the clump spread out** — but only once the shared entity is real, not merely textually similar.
- **A constructor field only some methods touch, or a flag added to make the merge fit, is a wrong-abstraction signal** — split back apart rather than force it.
- **Grouped by category or by execution order (switch-on-type, "do this at startup") is a smell, not a design** — look for what the branches or steps actually share, not when they happen to run.
- **Split a class whose methods fall into two groups that never touch the same fields** — that's two cohesive units wearing one name, the coincidental/logical failure in class form.
- **State the call when it's close:** "combined: all five methods mutate the same sandbox state, confirmed by a third caller needing the same bundle" or "left separate: both take a `name` but reason about different entities" — make the judgment checkable.

## Anti-patterns

- **Coincidental grouping.** A `utils`/`helpers` module whose contents share no data, no purpose, nothing but a filename.
- **Logical grouping.** One function dispatching on a type/kind tag over cases that share a name but not a mechanism.
- **Temporal grouping.** Things bundled because they run at the same time (`initializeEverything`), not because one needs another's result.
- **Data clump.** The same parameter or parameter group repeated across a module's function signatures — the entity that owns them was never made explicit.
- **Closure clump.** A factory function closing over several related pieces of state to return a bundle of callbacks, instead of a class.
- **Forced cohesion.** Combining functions that only coincidentally share a parameter's type, bending the result with a flag or optional field no caller needed before.
