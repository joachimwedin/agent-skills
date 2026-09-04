---
name: test-guidelines
description: How to write a test that verifies behavior instead of rotting alongside the code — Given-When-Then structure plus named anti-patterns (tautological assertions, bug-matching assertions, reflexive over-mocking, coverage chasing, interaction assertions, snapshot rubber-stamping, busy-waiting) and what to do when a test fails. Use whenever writing, editing, or reviewing a test.
---

# Test guidelines

Structure every test as Given-When-Then. The test name states the full scenario — Given the setup, When the action, Then the outcome — so a failing test is diagnosable from its name alone, without opening the body. Split the body into three commented sections matching the name:

```kotlin
@Test
fun `Given a cart with one item When applying a 10 percent discount Then reduce the total by 10 percent`() {
    // Given
    val cart = Cart(items = listOf(Item(price = 200)))

    // When
    val total = cart.applyDiscount(percent = 10)

    // Then
    assertEquals(180, total)
}
```

## What a good test does

- **Behavior, not structure.** Assert through the public interface, the way a real caller would use it. A refactor that doesn't change behavior shouldn't break the test.
- **One scenario, one guarantee.** The Then asserts exactly what the Given/When promises — not incidental detail alongside it.
- **Deterministic and isolated.** No shared mutable state, no unseeded randomness, no reliance on the real clock, network, or filesystem. Mock only a true external boundary — never an internal collaborator.

## Anti-patterns

**Tautological assertions.** The expected value is derived from the same code path being tested (or a mock is asserted to return what it was told to return). This proves the code ran, not that it's correct.

**Bug-matching assertions.** When the implementation is wrong, fix the implementation — don't write the Then to match its wrong output. A test's job is to encode intent, not to rubber-stamp whatever the code currently does.

**Reflexive over-mocking.** Mocking a collaborator that isn't a true external boundary, until nothing real executes and the test verifies wiring instead of behavior.

**Coverage chasing.** A test written to touch a line rather than to verify a guarantee. Coverage is a byproduct of testing real behavior, not something to target directly.

**Interaction assertions.** Verifying a mock *was called* instead of verifying the resulting behavior. This couples the test to implementation — a refactor that preserves behavior can still break it.

**Snapshot rubber-stamping.** Approving a snapshot diff without reading it turns the assertion into a no-op that always passes.

**Busy-waiting via sleep.** A hardcoded delay standing in for a real condition — wait on the actual state or event instead; a sleep is both slower and less reliable.

## When a test fails

Fix the implementation. If the right fix isn't clear, stop and report what failed, what you tried, and your hypothesis. Never weaken the assertion, skip the test, or delete it to force a green run — that hides the bug instead of resolving it.
