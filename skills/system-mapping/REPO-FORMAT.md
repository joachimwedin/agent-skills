# Repo Pointer Format

## CLAUDE.md (context pointers)

Lives in the context repo. Keep it to pointers only — one line per repo. Never inline a repo's purpose or dependencies here; that belongs in its own file.

```md
# {group-name}

Related repos: {repo-1}, {repo-2}.

- Need {repo-1}'s purpose or what depends on it? See [{repo-1}.md](./{repo-1}.md).
- Need {repo-2}'s purpose or what it depends on? See [{repo-2}.md](./{repo-2}.md).
```

## {repo}.md

One file per member repo, named after the repo.

```md
# {repo}

{One or two sentence purpose: what this repo is and why it exists.}

## Depends on

- **{other-repo}** — {what it consumes, and why}
```

A repo with no dependencies on its siblings omits the `## Depends on` section entirely — don't write "None."

## Rules

- **Create lazily.** Don't scaffold every repo's `.md` up front — write one the first time that repo's purpose or a dependency on it is actually discussed.
- **Purpose stays short.** One or two sentences.
- **Dependencies name the direction and the why**, not just "depends on X." "shop-web depends on shop-api for its REST client" beats "shop-web uses shop-api."
