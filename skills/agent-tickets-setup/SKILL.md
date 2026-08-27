---
name: agent-tickets-setup
description: Bootstrap the local agent-tickets directory — the shared issue tracker AI agents use for specs and tickets across your projects. Runs once per machine.
disable-model-invocation: true
---

# Agent Tickets Setup

An individual project doesn't need its own setup step — it just gets a
subfolder inside `agent-tickets` the first time a ticket is published to
it. This skill only handles the directory itself, once, machine-wide.

## 1. Check for an existing directory

If `~/repos/agent-tickets` already exists, tell the user it's already
set up and stop.

## 2. Create the directory

Create `~/repos/agent-tickets`, then write a `README.md` into it:

```md
# agent-tickets

AI-agent-operated issue tracker for the repos under `~/repos`.
Convention: see the `agent-tickets` skill in `agent-skills`.
```

## 3. Hand off

Tell the user `agent-tickets` is ready, and that `to-spec`, `to-tickets`,
and `wayfinder` will create project subfolders under it automatically
the first time each publishes a ticket.
