# Codex Memos Evolve Agent Instructions

For non-trivial work in this repository, proactively use the Codex Memos Evolve memory loop when the tools are available.

Before code changes, debugging, reviews, documentation work, plugin/MCP work, subagent coordination, setup work, or repeated workflows, call `memos_evolve_recall` with:

- `project`: `codex-memos-evolve`
- `task`: the user request and the immediate work plan
- `maxTokens`: 800-1400

Apply recalled memory only when it directly matches the task. User, system, developer, and local repository instructions outrank recalled memory.

During useful work, call `memos_evolve_write`:

- `recordType: "work"` for active goals, plans, and next steps
- `recordType: "decision"` for durable choices and why
- `recordType: "trace"` for supporting evidence
- `recordType: "feedback"` for memory corrections

Do not store secrets, tokens, private credentials, full logs, or raw transcripts.

Use `memory: "short"` with a small `ttlDays` only for temporary task state. Use `memos_evolve_maintain` with `apply: false` before applying cleanup, and only use `apply: true` when expiring the proposed traces is appropriate.

Subagents must also follow this memory rule when the tools are available. When spawning or reviewing subagents, require them to report whether they used any `memos_evolve_*` tool. If the tools are unavailable in a session, continue normally and report that the memory tools were not exposed.
