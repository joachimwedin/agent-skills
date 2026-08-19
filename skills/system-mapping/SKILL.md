---
name: system-mapping
description: Build and sharpen how a group of related repos relate to each other — each repo's purpose, and its dependencies on the others and why. Use when the user wants to document why one repo depends on another, or record a repo's purpose, or when another skill needs to maintain it.
---

# System Mapping

This is the active discipline — challenging dependency claims, cross-referencing them against code, and writing each repo's `.md` file the moment something resolves. (Merely following a pointer from `CLAUDE.md` to a repo's `.md` file is not this skill — that's a one-line habit any skill can do. This skill is for when you're changing those files, not just consuming them.)

## File structure

Lives in a dedicated context repo, a sibling of the repos it describes. For example, a group holding a `shop-api` service and the `shop-web` frontend that calls it:

```
~/repos/
├── shop-api/
├── shop-web/
└── shop-context/
    ├── CLAUDE.md    ← context pointers
    ├── shop-api.md   ← shop-api's purpose, what depends on it and why
    └── shop-web.md   ← shop-web's purpose, what it depends on and why
```

Use the format in [REPO-FORMAT.md](./REPO-FORMAT.md).

Create files lazily — only when you have something to write. Adding a repo to the group means adding its pointer line to `CLAUDE.md`; its own `.md` file waits until there's a purpose or dependency to record.

## During the session

### Challenge against existing pointers

When the user describes a repo's purpose or a dependency in a way that conflicts with its existing `.md` file, call it out. "shop-web.md says it depends on shop-api for its REST client only — but you're describing a second dependency on shop-api's auth tokens. Is that real, or does shop-web.md need updating?"

### Sharpen the "why"

A dependency line that just names the other repo isn't done. Push for the actual reason: what does it consume, and why that repo instead of duplicating the logic.

### Cross-reference with code

Check the claimed dependency against reality — an import, a `package.json` entry, a git submodule. If the code doesn't back up what's being described, surface the mismatch.

### Update inline

When a repo's purpose or a dependency resolves, write it into that repo's `.md` file right there — don't batch.
