---
paths:
  - ".claude/agents/**"
---

# Agent definition rules

Editing an agent definition is snapshotted at session start; creating a new one is not. A new file in `.claude/agents/` registers and is dispatchable at once, but an edit to an existing one does not reach subagents dispatched later in the same session. Restart the session before testing an agent change. Skills and path-scoped rules load live, including inside subagents.
