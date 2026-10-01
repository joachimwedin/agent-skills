---
name: encapsulation
description: Encapsulation — bundling an object's state together with the behavior that operates on it, and closing off direct access to that state so every mutation goes through methods that keep it valid. Use when a caller can read or write a field directly instead of calling a method, when state is being assigned into an object from outside instead of a method deciding the assignment, or when checking whether a class formed from loose functions actually hides its fields and protects an invariant.
---

# Encapsulation

An object encapsulates when its state and the behavior that operates on that state live in one place, and nothing outside that place can touch the state directly. The payoff isn't hiding for its own sake — it's that every caller is structurally unable to put the state into a combination the object itself would reject.

## What changes once a class exists

Say six functions that each took `name: string` have just been combined into a class — now an `SbxClient` with `name` captured once in the constructor. That move alone buys grouping, not hiding: if `name` and every other field is still public, callers can still reach in and reassign them, and the class is just the old parameter list wearing a constructor. Encapsulation's job starts here — keep the mechanics (exact argv construction, `execFileSync` vs `spawnSync`, the temp-file write/copy/cleanup dance) as private fields and private helper methods, reachable only through a small set of public methods (`exists()`, `create()`, `exec()`, `writeSettings()`). The same applies to a test fixture closing over a temp bin dir, a temp state dir, a log path, and a saved `PATH`: turning it into a class is one move, but making those four fields private — so the only way to interact with them is `readLog()`, `cpMirrorPath()`, `teardown()` — is the encapsulation move.

## What to hide, what to keep public

Hide the representation; keep the capability. The representation is *how* — argv construction for a wrapped CLI, `execFileSync` vs `spawnSync`, the temp-file dance inside a write, the exact shape of an internal map. The capability is *what a caller needs done* — `exists()`, `create()`, `exec()`, `writeSettings()`. Decompose around hiding the design decision most likely to change, so that when it changes, exactly one module's internals are touched and every caller's code is untouched. If the real CLI's argument shape changes tomorrow, the question to ask of your own design is: how many files does that touch? One means it was actually hidden; more than one means the decision leaked past the boundary you drew.

Bundling data and methods into a class doesn't automatically deliver this — a class can bundle data and methods and still expose every field as public, or hand back a mutable reference to its internals. Bundling is necessary but not sufficient; the access control has to actually close the gap for the hiding to happen.

## Protect the invariant

Once state lives inside an object, its methods are the only gate — so make the gate check something. A constructor should refuse to build an inconsistent instance rather than build one and hope callers fix it up before using it; a mutating method should refuse a change that would leave its own invariant broken, rather than trust the caller to have checked first. Prefer *tell, don't ask*: push the decision into the method that owns the state (`account.withdraw(amount)`) instead of reading the state out, deciding externally, and writing a new value back in (`if (account.balance >= amount) account.balance -= amount`) — the external version means the invariant ("balance never goes negative") now has to be remembered at every call site instead of enforced once.

## Heuristics

- **After grouping, re-check for privacy.** Just pulled a cluster of related functions into a class? That fixes grouping, not access — immediately ask whether the new fields are private and whether a method guards every write.
- **Field access test.** Can a caller read or write a field directly, skipping every method? If yes, it isn't encapsulated, whatever the class is named.
- **Hide the how, keep the what.** The mechanism (format, library call, temp-file handling) is the thing likely to change — hide it. The capability a caller depends on stays in the public interface.
- **Make invalid states unrepresentable.** A constructor or setter should be the place that refuses a bad combination — not a comment telling callers to check first.
- **Tell, don't ask.** Prefer a method that takes the action over reading state out, branching externally, and writing a new value back.
- **One mutation funnel per invariant.** If a rule must hold, route every writer through the same one or two methods, so the check exists exactly once.
- **New state, same owner.** When adding a field to an existing class, add the method that mutates it there too — don't let a caller reach in and set it from outside because "it's just one field."

## Anti-patterns

- **Grouped but not guarded.** A class formed by combining a parameter clump whose fields are still public — the clump moved, nothing was actually hidden.
- **Anemic object.** A class that is only data — public fields, no methods — with the logic that should guard it scattered across its callers instead.
- **Leaky setter.** A method that assigns a field verbatim with no validation, so the invariant depends on every caller happening to pass something valid.
- **Ask-then-act.** Reading an object's state out, deciding what to do externally, then writing the result back in, instead of telling the object to do it.
- **Reach-in mutation.** Code outside the class assigning to a field directly because a method for that change wasn't worth writing.
