---
name: object-oriented-decomposition
description: Object-oriented decomposition — splitting a system around the key abstractions in the problem domain (things with state, identity, and behavior) rather than around the steps of a process. Use when deciding whether new logic becomes a class or a plain function, when a module is a loose collection of functions that all close over or re-pass the same implicit state, or when naming a new file or class.
---

# Object-oriented decomposition

A system can be split two ways: around the steps a process goes through (algorithmic decomposition — a module per step, wired by call order), or around the key abstractions in the problem domain (object-oriented decomposition — things with identity, state, and behavior, with the steps falling out of calling their methods). Messy "function soup" code is rarely a deliberate choice to decompose by process step — it's what accumulates when nobody picks between the two on purpose, so one more loose function is always the easiest next move.

## Classes are the default

Default to a class — even a one-method class standing for a single responsibility — for any new piece of logic. A floating function is the exception, and only earns that exception when all three hold:

- **Stateless and context-free.** Same input, same output, always — no config, no collaborators, nothing ambient.
- **Invoked, not referenced.** No other code needs to hold, pass around, inject, or substitute this as a value — it's called once by name, never stored in a field or swapped for an alternative. A good, noun-ish name is not evidence it fails this test: a well-named pure formatter or parser that's only ever called, never held onto, still passes.
- **Nothing to swap.** There is, and is ever likely to be, exactly one way to do it.

Even when a function clears all three, prefer a method on a class that already owns the concept it operates on over a new free-standing function — the exception is for logic that belongs to no one, not logic that's merely small.

A class earns its keep by hiding the design decision most likely to change behind its own interface, so that when that decision changes, it touches one file, not several. A function that only shares a parameter with its neighbors because nothing owns it should become a class, not stay a loose module. A value with its own validation, comparison, or formatting rules — money, an email address — is class-worthy with nothing mutable to hide; don't flatten it into a plain type with free functions just because nothing changes after construction.

## Naming follows the decomposition

- **File-symbol correspondence.** A file with one dominant exported class or interface is named for that symbol, PascalCase matching exactly (`ShoppingCart.ts` exports `ShoppingCart`). A file with no single dominant export — pure types, stateless utilities — stays lowercase/kebab.

## Heuristics

- **Ask "is this invoked, or referenced?" before writing a free function.** Held in a field, passed around, injected, or swapped → a class. Called once by name and nothing else → the exception may apply.
- **A good, noun-ish name is not evidence something needs a class.** The test is whether other code holds it as a value, not whether it sounds like one.
- **"If this decision changes, how many files does that touch?"** More than one means the hiding didn't happen, whatever the boundaries claim.
- **A repeated parameter across a module's functions, with nothing else binding them, is a sign the module should have been a class.**
- **A value with validation, comparison, or formatting rules is class-worthy even with zero mutable state** — don't let "nothing to mutate" talk you out of modeling it.
- **Name the file for the symbol it exports, or don't PascalCase it.**
- **Ask what a thing is responsible for and who it collaborates with, not what nouns describe it** — responsibility, not vocabulary, is what makes something a class.

## Anti-patterns

- **Function soup as default, not as a decision.** Every new piece of logic becomes a free function with no check for whether it shares state with its neighbors.
- **Anemic grouping.** Functions combined into a class to stop parameter-passing, without the class ever gaining real behavior, validation, or identity beyond what the loose functions already had.
- **File named for its folder or feature, not its export.** A file holding one dominant class but named generically (`client.ts`, `handler.ts`).
- **Classitis masquerading as good decomposition.** Several thin classes introduced to "be OO" that only make sense read together.
- **Promoted by name alone.** A purely invoked, stateless helper forced into a one-method class because it has a descriptive, noun-ish name, when nothing actually holds or swaps it.
