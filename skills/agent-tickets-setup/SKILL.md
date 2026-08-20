---
name: agent-tickets-setup
description: Bootstrap the local agent-tickets git repo — the shared issue tracker AI agents use for specs and tickets across your projects. Runs once per machine.
disable-model-invocation: true
---

# Agent Tickets Setup

An individual project doesn't need its own setup step — it just gets a
subfolder inside `agent-tickets` the first time a ticket is published to
it. This skill only handles the repo itself, once, machine-wide.

## 1. Check for an existing repo

If `~/repos/agent-tickets` already exists and is a git repo, tell the
user it's already set up and stop.

## 2. Create the repo

`git init` at `~/repos/agent-tickets`, then commit a `README.md`:

```md
# agent-tickets

AI-agent-operated issue tracker for the repos under `~/repos`.
Convention: see the `agent-tickets` skill in `agent-skills`.
```

## 3. Hand off

Tell the user `agent-tickets` is ready, and that `to-spec`, `to-tickets`,
and `wayfinder` will create project subfolders under it automatically
the first time each publishes a ticket.
