---
name: negative-space
description: Negative space programming — state what must not happen and make the code fail loudly when it does (assertions, preconditions, invariants, exhaustive matching, no silent fallbacks, negative tests). Use whenever writing, editing, or reviewing code that validates input, handles errors, defaults a missing value, branches over a closed set of cases, or has a catch or fallback path.
---

# Negative space

Code has a positive space (the states the design expects) and a negative space (every state it does not). Bugs live where data crosses from one to the other. Program the negative space: write down what must not happen and make the program stop at the first sign of it, so the fault surfaces where it originates and not three layers later as a wrong answer.

The fault kinds decide the tool, so classify before writing any check:

| Fault | Cause | Response |
| --- | --- | --- |
| **Bug** | A broken internal assumption: caller passed what the contract forbids, an invariant no longer holds, a case nobody planned for | Assert, and stop |
| **Expected failure** | The world misbehaving in a way that can be foreseen: bad user input, a timeout, a missing file, a rejected request | Handle: a typed result or a named exception at the boundary |

Assertions guard against bugs. An expected failure that is asserted crashes production on ordinary input; a bug that is handled as an expected failure is swallowed and travels on.

## Assert the contract, both sides

Assert what you expect *and* what you do not expect, at the edges of every function: arguments, results, and the invariants in between.

- **Preconditions** on arguments: `require(quantity > 0) { "quantity must be positive, was $quantity" }`.
- **State** checks on the receiver: `check(order.isOpen) { "cannot add a line to a closed order" }`.
- **Unreachable** branches: `error("unhandled payment kind $kind")`.
- **Postconditions** on what you return, when the result is non-trivial.
- The message names the broken assumption and includes the offending value.
- One condition per assertion, so a failure points at the exact one: `require(a); require(b)`, not `require(a && b)`.
- **Pair** assertions: for a property that matters, assert it on two different paths, such as right before writing and right after reading.

The strongest assertion is one the compiler checks. Prefer, in order: a type that cannot express the bad state, a compile-time check (exhaustive `when`, sealed types), then a runtime assertion.

## Fail loudly, never silently

A default, a swallowed exception or a fallback turns a bug into a wrong answer with no witness.

- No `?: ""`, `?: 0`, `?: emptyList()` to get past a value that should exist. Either absence is valid and has its own named representation, or it is a bug and stops.
- No empty `catch`, no `catch` that logs and continues past a broken invariant, no `else -> default` over a closed set.
- Match a closed set exhaustively with no `else`, so a new case is a compile error and not a silent fall-through.
- Keep assertions on in production: a system that stops with a message is safer than one that runs on with corrupt state.

## Validate at the boundary, trust inside

External input is checked once, where it enters, and becomes a typed value. Inside the boundary the code asserts its invariants and does not re-validate defensively (shotgun parsing: checks scattered through processing code with no systematic justification). An invalid external value gets an explicit outcome: rejected with a named exception, or an explicit case like `UNKNOWN`. It never travels inward as a bare string or a `null`.

## Test the negative space

Tests cover the rejected input, the violated precondition and the unknown case, and cover valid data turning invalid, since that transition is where bugs concentrate. Each assertion you write earns a test that trips it.

## Heuristics

- **Could this condition become false only by editing this code?** Yes → assert. The condition depends on the outside world (network, disk, user, clock, another process) → handle it as a real, typed failure path.
- **A `catch`/`except` that never references the caught error's content** — doesn't inspect it, rethrow it transformed, or act on it — is a swallowed exception even when it superficially "handles" something.
- **A `try`/`catch` around code with no I/O, no parsing and no external call needs a named exception it's defending against.** Can't name one → the wrapper is padding, not handling.
- **A default or optional parameter's wrong value should be loud three call sites downstream, not silently absorbed.** If nothing visibly changes when the default is wrong, the parameter should be required, or the default should fail a downstream assertion.
- **Audit unchecked return values as carefully as caught-and-ignored exceptions** — an ignored promise rejection, a discarded `.find()`/`.get()` result. A callee that reports failure and gets ignored is the same bug either way.
- **Weigh the count of defensive constructs against the count of operations in the function that can actually fail.** A high ratio is a sign of reflexive, not reasoned, defensiveness.

## Anti-patterns

- **Defensive default.** A fallback value that keeps the run going past a missing thing.
- **Falsy fallback.** `a or b or default` swallows a genuine `0`, `""`, or `false` as if it were absent — a sharper, easier-to-miss variant of the defensive default.
- **Swallowed exception.** `catch` with nothing, or a log line and a `return null`.
- **Unchecked return value.** A failure the callee reported and the caller never looked at.
- **Assert on input.** An assertion where the world can legitimately produce the bad value; a bad request should be a 4xx, not a crash.
- **Handled bug.** Error handling on a case the design says is impossible, hiding that the design is wrong.
- **Silent default branch.** An exhaustive match's `else`/default returns a generic value instead of erroring — it defeats the exhaustiveness check without looking like it.
- **Vague failure.** `require(x)` with no message, or a message that omits the value.
- **Compound assertion.** Several conditions in one, so the failure cannot say which broke.
- **Shotgun validation.** The same input re-checked at every layer instead of once at the boundary.
