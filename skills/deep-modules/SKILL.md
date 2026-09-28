---
name: deep-modules
description: Deep modules — a lot of functionality behind a small, complete interface, with design decisions genuinely hidden rather than merely marked private. Use when judging the shape of a class, function, or module; when several small classes or functions collaborate to do one thing; when a function's parameters or behavior only make sense after reading its call sites; when a method mostly forwards to another call; or when code is split by execution step (parse, then validate, then save) rather than by what it knows.
---

# Deep modules

A module (function, class, or file) is **deep** when it gives a lot of functionality for a small interface, and **shallow** when the interface is nearly as complex as what's behind it. A reader should be able to use or review a deep module from its interface alone — never opening the implementation, never opening its callers.

## Depth test

1. How much must a caller know to use this correctly?
2. How much work happens behind that?
3. Could a caller skip it and do the work directly, for similar effort?

Yes to (3): shallow. Sharper trigger: the doc comment would run longer than the body.

## The interface is bigger than the signature

It includes invariants, ordering rules, what it mutates or calls out to, error modes, required config — anything a caller must know. A fact you can only justify by pointing at an existing call site ("everyone always passes a non-empty list") is missing from the interface, not part of a small one. A `private` field with a matching getter/setter isn't hidden either — the caller still knows it exists.

## Knowledge ownership

Each design decision — format, algorithm, protocol, layout — has one owning module. If changing it means editing more than one module, it's leaked. The usual cause is **temporal decomposition**: splitting by execution order (read, then parse, then save) instead of by what each piece knows, so steps end up sharing an assumption neither owns. Interface leakage puts the shared decision in a signature, at least visibly; **back-door leakage** hides it in both implementations with nothing on either surface — worse, since nothing signals the dependency.

## Heuristics

- **Classitis** — several small classes or functions that only make sense read together (a `Reader`, `Writer`, `Validator`, each wrapping one call) is the common failure, not a god-class. Merge; don't document the seams harder.
- **Pass-through method** — forwards to another call with a similar signature and does little else. If deleting it changes nothing for the caller, delete it. Legitimate as a dispatcher, or one of several implementations of a shared interface.
- **Pass-through variable** — data threaded through a chain of signatures just to reach one method at the bottom. Prefer, in order: a shared object both ends already have; a single immutable context object; a global, last.
- **Default it away.** A parameter with a sensible default is one less thing every caller specifies.
- **Define errors out of existence.** A failure mode the interface rules out by construction needs no documentation and no caller handling.
- A long method is fine when its blocks are independent — splitting hurts when they aren't, since the reader now jumps between methods to see what one used to show them.
- Two modules that vary independently — different callers, different lifetimes — stay separate. Merge by knowledge ownership, not by size.
- A parameter that genuinely varies by caller (a timeout, a flag the caller must decide) belongs in the interface, in full view; hiding it isn't the goal, hiding what callers don't need is.

## Anti-patterns

- **Shallow module.** Interface about as complex as the implementation — a caller could just as easily do the work directly.
- **Classitis.** A cluster of thin, collaborating classes that must be read together to be understood.
- **Pass-through method/variable.** Interface cost with no added functionality.
- **Temporal decomposition.** Modules split by execution order instead of by owned knowledge.
- **Back-door leakage.** Two modules share an assumption with nothing on either surface revealing it.
- **False privacy.** A `private` field with a getter/setter, exposed in all but name.
