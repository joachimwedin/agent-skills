---
name: to-tasks
description: Turn a spec into a task list in the current session, as vertical slices that each declare the tasks blocking them. Use when the user has a spec and wants it broken into tasks.
---

Break a spec into **tasks** in this session's task list. Each task is a vertical slice: a complete path through every layer (schema, API, UI, tests), not a slice of one layer. Each task declares the tasks that **block** it. Create the tasks and stop.

1. **Read the spec** in full: the path the user passed, or the spec in the conversation.
2. **Draft the tasks** and their blocking edges.
3. **Create them** with `TaskCreate`, blockers first, then set each task's blocking edges with `TaskUpdate` (`addBlockedBy`).

Each task carries:

- **A pointer to the spec file**: its full path.
- **A complete description of the vertical slice** it builds: the end-to-end behaviour across every layer, enough that an agent reading only this task and the spec can build it.
- **An instruction to use the `implement` skill and follow it as written**, so whichever agent picks the task up does the work the way that skill prescribes.
