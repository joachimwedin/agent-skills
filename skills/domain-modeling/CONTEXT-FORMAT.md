# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Shared glossary
{Optional — only if this repo shares terms with a wider system. See "Shared glossary across repos" below.}

Cross-cutting terms are defined in [{shared-repo-name}](../{shared-repo-name}/CONTEXT.md). Check there before coining a new term, or if a term seems to span repos rather than belong to this one.

## Language

**Order**:
{A one or two sentence description of the term}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Avoid_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

## Single vs multi-context repos

**Single context (most repos):** One `CONTEXT.md` at the repo root.

**Multiple contexts:** A `CONTEXT-MAP.md` at the repo root lists the contexts, where they live, and how they relate to each other:

```md
# Context Map

## Shared glossary
{Optional — only if this repo shares terms with a wider system. See "Shared glossary across repos" below.}

Cross-cutting terms are defined in [{shared-repo-name}](../{shared-repo-name}/CONTEXT.md). Check there before coining a new term, or if a term seems to span repos rather than belong to this one.

## Contexts

- [Ordering](./src/ordering/CONTEXT.md): receives and tracks customer orders
- [Billing](./src/billing/CONTEXT.md): generates invoices and processes payments
- [Fulfillment](./src/fulfillment/CONTEXT.md): manages warehouse picking and shipping

## Relationships

- **Ordering → Fulfillment**: Ordering emits `OrderPlaced` events; Fulfillment consumes them to start picking
- **Fulfillment → Billing**: Fulfillment emits `ShipmentDispatched` events; Billing consumes them to generate invoices
- **Ordering ↔ Billing**: Shared types for `CustomerId` and `Money`
```

The skill infers which structure applies:

- If `CONTEXT-MAP.md` exists, read it to find contexts
- If only a root `CONTEXT.md` exists, single context
- If neither exists, create a root `CONTEXT.md` lazily when the first term is resolved

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.

## Shared glossary across repos

Independent of single vs. multi-context: a repo whose terms are partly owned by a wider system (several repos, not just this one) can add a `## Shared glossary` section — to its `CONTEXT.md` if single-context, or its `CONTEXT-MAP.md` if not — linking to another repo's `CONTEXT.md` that holds the cross-cutting terms. This is orthogonal to whether the repo itself split into multiple internal contexts.

This link is the only way the skill looks outside the current repo. Never infer a shared glossary by checking whether a sibling directory happens to exist — only an explicit `## Shared glossary` link makes one repo's terms reachable from another.

When a term being resolved clearly isn't specific to this repo — other repos independently reference the same concept — prefer adding it to the shared glossary over duplicating it locally.