# Repo Pointer Format

## CLAUDE.md (context pointers)

Lives in the context repo. Keep it to pointers only. Never inline a repo's purpose or dependencies here; that belongs in its own file under `repos/`. State the convention once, near the top, so the index below only needs to name each repo, not link to it — a link would go dead the moment a repo is listed before its file exists, since files are created lazily.

```md
# {group-name}

Every member repo's detail lives at `./repos/{repo}.md`.

- **Domain glossary**: [CONTEXT.md](./CONTEXT.md) (only once it exists)
- **Architecture decisions**: [docs/adr/](./docs/adr) (only once the first ADR exists)

## System shape

{A handful of durable, always true facts about the group as a whole - not a repo's own detail. Keep this very short: a few one-line facts, not paragraphs. Omit the section entirely if there's nothing that clears the bar of "true of the whole system, not just one repo."}

## {First group heading}

{repo-1}, {repo-2}

## {Second group heading}

{repo-3}, {repo-4}
```

Group entries under headings when natural clusters emerge - mirroring how `CONTEXT.md` groups terms under subheadings. If all repos belong to one cohesive group, or there are only a couple, a flat comma-separated list under the index needs no headings at all. 

What clusters repos varies by what the group actually is - a services architecture might split by role (frontends, APIs, infrastructure); a library ecosystem might split by package type or consumer; a tool suite might split by what team owns each. Derive headings from what actually clusters **this** group of repos.

## repos/{repo}.md

One file per member repo, named after the repo, in the `repos/` subdirectory.

```md
# {repo}

{One or two sentence purpose: what this repo is and why it exists.}

## Depends on

- **{other-repo}** — {what it consumes, and why}
```

A repo with no dependencies on its siblings omits the `## Depends on` section entirely — don't write "None."

## Rules

- **Create lazily.** Don't scaffold every repo's `repos/{repo}.md` up front — write one the first time that repo's purpose or a dependency on it is actually discussed.
- **Purpose stays short.** One or two sentences.
- **Dependencies name the direction and the why**, not just "depends on X." "shop-web depends on shop-api for its REST client" beats "shop-web uses shop-api."
