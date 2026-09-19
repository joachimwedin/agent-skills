---
name: ddd
description: Domain-driven design patterns. Use when designing, placing or reviewing domain code: entities, value objects, aggregates, repositories, domain services, domain events, bounded contexts, or deciding which layer a rule belongs in.
---

# DDD

Model the business in the domain layer; every other layer serves it.

Pair with `domain-modeling` (the glossary, `CONTEXT.md`) and `codebase-design` (module depth and seams).

## What DDD is

An approach to software with a complex business domain: the code is a model of the domain, built together with domain experts, and it is the model that drives the design. It has a strategic side (draw boundaries and share a language) and a tactical side (the building blocks below).

## Key points

- **The model is the design.** Code, conversation and glossary share one model, so a change in the business shows up as a change in the model.
- **Language first.** Developers and domain experts use the same terms; when a term is fuzzy, sharpen it before coding it.
- **Isolate the domain.** Business rules live in the domain layer, free of UI, database and vendor concerns.
- **Draw boundaries.** Each bounded context keeps its own small, consistent model; aggregates keep each rule's consistency boundary explicit.
- **Spend effort where it pays.** Invest in the core domain and keep generic parts plain.

## Benefits

- Fewer translation errors between business and code, since both speak the same language.
- Business rules sit in one place, so they are easy to find, test and change.
- The domain is testable without a database, framework or network.
- Boundaries contain complexity as the system grows.

Full DDD costs effort, so use its tactical patterns on the complex core; plain CRUD serves the simple remainder.

## Building blocks

- **Business logic** — the rules and decisions that define how the business works: what is valid, what matches, how something is calculated. It belongs in the domain layer; the test is whether it would still hold under a different UI, database or vendor.
- **Ubiquitous language** — one vocabulary shared by code and domain experts, so a term means one thing everywhere.
- **Bounded context** — the boundary inside which one model and language hold.
- **Entity** — an object defined by identity, not attributes.
- **Value object** — immutable, no identity, equal by value; its operations are side-effect-free.
- **Aggregate** — a cluster of objects changed as one unit. One **root** is the only member outsiders hold; the root enforces the cluster's invariants; one transaction changes one aggregate.
- **Repository** — a collection-like port that loads and stores whole aggregates, one per aggregate root.
- **Factory** — creates a whole object with its invariants satisfied.
- **Domain service** — a stateless operation that fits no single entity or value, named in the ubiquitous language.
- **Application service** — coordinates a task by loading, calling domain behavior and mapping the result; it holds no business logic.
- **Domain event** — a record of something that happened, named in the past tense (`OrderPlaced`), published by an aggregate so other parts react without coupling.
- **Anticorruption layer** — a translating layer that keeps a foreign model out of yours. Vendor SDK types stay behind a port the domain owns.
- **Side-effect-free function** — computes a result and changes nothing.
