# Architecture

Codex Memos Evolve is a local MCP plugin that stores durable agent memory in usememos/memos. The implementation is intentionally small: MCP tool definitions live in `src/mcp-server.mjs`, memory behavior lives in `src/evolver.mjs`, and persistence lives in `src/memos-client.mjs`.

## High-Level Flow

```text
Codex task
  -> memos_evolve_recall
  -> compact policies and skills
  -> Codex work
  -> memos_evolve_record_trace
  -> memos_evolve_reflect
  -> policy and skill memos
  -> future recall
```

Memos is both the backing store and the first visible UI.

## Components

| Component | Responsibility |
| --- | --- |
| `src/mcp-server.mjs` | Registers MCP tools and validates tool input with Zod. |
| `src/evolver.mjs` | Implements recall, trace recording, reflection, feedback, and stats. |
| `src/memos-client.mjs` | Talks to usememos/memos or falls back to local JSON storage. |
| `skills/memos-evolve/SKILL.md` | Tells Codex when to use the memory loop. |
| `/home/sbplab/sky/.tools/memos` | Existing workspace Memos service on port `5230`. |
| `vendor/memos` | Upstream usememos/memos source as a git submodule. |

## Memory Layers

### Trace

A trace is a grounded task record. It should contain concrete evidence from work that happened:

- task
- outcome
- observations
- corrections
- value score
- project
- topic tags

Trace records are useful, but they are too verbose to recall forever.

### Policy

A policy is promoted from repeated traces. It captures a recurring rule or preference that should influence future work.

Policies include support counts so users can see why the rule exists.

### Skill

A skill is a reusable workflow distilled from stable policies. Recall prefers skills and policies over raw traces because they are shorter and more actionable.

Skill memos are not automatically installed as Codex skill folders yet. They are stored in Memos as structured Markdown.

### Feedback

Feedback records whether a memory, policy, or skill was useful, wrong, stale, too broad, or too noisy. Recall uses feedback scoring to suppress poor targets and favor useful ones.

## Storage Modes

### Memos API Mode

When both variables are set, the plugin writes to usememos/memos:

```bash
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=...
```

This mode provides durable storage and a visible web UI.

### Local JSON Mode

When `MEMOS_PAT` is missing, the plugin writes to:

```text
.data/local-memos.json
```

This mode is intended for tests and local development only.

## Tag Model

All records include:

```text
#codex-memos-evolve
#project/<project-name>
```

Type tags:

```text
#type/trace
#type/policy
#type/skill
#type/feedback
```

Promotion tags:

```text
#support/<n>
#version/<n>
#skill/<slug>
#status/active
```

## Recall Rules

Recall is designed to keep memory bounded:

- Prefer active skills and policies over raw traces.
- Rank by project relevance, topic relevance, support, version, and feedback.
- Suppress stale or negatively rated targets.
- Suppress secret-looking content.
- Enforce the caller's token budget.
- Skip retrieval for trivial tasks when appropriate.

The goal is not to remember everything. The goal is to return the smallest useful guidance for the current task.

## Reflection Rules

Reflection looks for repeated traces with enough support. When `minSupport` is reached, the engine can create:

- a policy memo
- a skill memo

This creates a visible chain:

```text
trace evidence -> policy -> skill -> future recall
```

## Safety Model

Memory is lower priority than explicit user instructions. Recalled guidance must be treated as project context, not as a command.

The plugin avoids common secret leakage paths:

- `MEMOS_PAT` is not stored in documentation.
- `.env` is gitignored.
- secret-looking traces and feedback are rejected before storage.
- secret-looking recall candidates are suppressed.

## Current Extension Points

Useful next steps:

- Add automatic lifecycle invocation when Codex exposes stable hooks for this workflow.
- Add a dashboard that reads the same Memos tags.
- Add embeddings or LLM clustering for stronger reflection.
- Add archival or superseding operations in Memos instead of retrieval-time suppression only.
- Add generated skill installation into Codex's real skill directories.
