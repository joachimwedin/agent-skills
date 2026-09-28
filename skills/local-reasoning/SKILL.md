---
name: local-reasoning
description: Local reasoning — understanding a function or class correctly from its definition alone, never by tracing callers, call order, or global state. Use when code reaches for a singleton, global, or shared mutable state instead of taking it as input, mutates an argument in place, or only works correctly in a particular call order.
---

# Local reasoning

You should be able to trust your understanding of a function or class from its definition alone — never by tracing who calls it, never by checking what else is running, never by learning the rest of the system. A piece of code's **footprint** is everything it actually reads or writes: its parameters and return value, plus anything outside itself it touches. Local reasoning holds when the declared footprint — the signature, constructor dependencies, documented effects — equals the real one: does it touch anything it didn't declare?

## The footprint test

List what the code actually reads and writes: parameters and return value, but also anything reached via import, singleton, global, shared mutable field, or ambient context (current time, current user, a feature flag). Compare that to what's declared. Anything on the "actual" list missing from the "declared" list is a hidden footprint — understanding this code now requires information it never told you it needed.

## Action at a distance

The named failure: behavior here changes because of a state change over there, with nothing at this call site pointing to the connection. Common sources: module-level or static mutable state; a singleton or service locator reached for inside a function instead of passed in; calls that only work in a particular order with nothing enforcing or declaring it; a shared mutable object passed by reference and mutated by more than one owner.

## Heuristics

- **Pass it in, don't reach for it.** If correctness depends on some value, it's a parameter or constructor argument, not an import, a singleton, or a global.
- Ambient context (clock, random seed, environment variable, feature flag) is a hidden dependency like any other — inject it so a reader, and a test, can see and control it from the signature.
- **Order sensitivity is part of the footprint.** If calling this correctly requires another call first, say so — a type that can't be constructed out of order, a precondition — rather than leaving it as tribal knowledge.
- **Declare it in the name or type, not a comment.** A parameter typed `currentUserId: UserId` beats `id: String` with a comment explaining whose id it is. Reach for a comment only for what naming and types genuinely can't say — it's the fallback, not the first move.
- **Check both directions.** Does this code depend on anything it doesn't declare, and does it change anything it doesn't declare? Either one breaks local reasoning.
- A test that has to set up unrelated global state, mock a singleton, or run other code first to pass is a footprint smell before it's a testing problem.

## Anti-patterns

- **Action at a distance.** Behavior here depends on a state change made somewhere else, invisible from this call site.
- **Ambient dependency.** A global, singleton, service locator, or module-level mutable state reached for instead of passed in.
- **Hidden mutation.** A function that mutates an argument or shared object without that being visible in its name or return type.
- **Order-dependent call.** Correctness depends on call order that nothing in the signatures enforces or documents.
- **Context leakage.** Reading the clock, an environment variable, or a feature flag directly inside logic instead of receiving it as input.
