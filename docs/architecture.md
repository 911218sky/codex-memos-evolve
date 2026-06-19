# Architecture

Codex Memos Evolve has three moving parts:

1. Codex calls MCP tools.
2. The MCP server reads and writes Memos records.
3. Future recall returns active work, decisions, compact policies, and only a little trace evidence.

![Codex Memos Evolve architecture](../assets/codex-memos-evolve-architecture.png)

In the diagram, external MCP tools such as filesystem, search, or git are examples of the wider Codex tool environment. This plugin provides three memory tools: recall, write, and maintain.

## Flow

```text
Codex task
  -> recall useful memory
  -> do the work
  -> write work, decision, trace, or feedback memory
  -> maintain short-lived and low-value traces
  -> reuse policies and skills later
```

## Components

| Component | Role |
| --- | --- |
| `src/mcp-server.ts` | Defines the three MCP tools and validates inputs. |
| `src/evolver.ts` | Handles recall, write, promotion, stats, and maintenance. |
| `src/memos-client.ts` | Connects to Memos or explicit local JSON test storage. |
| `skills/memos-evolve/SKILL.md` | Tells Codex when to use the memory loop. |
| Memos | Stores tagged Markdown records and provides the visible UI. |

## Memory Layers

| Layer | Meaning | Why it exists |
| --- | --- | --- |
| Work | Active task memory with native Markdown task lists. | Gives AI current goals and next actions first. |
| Decision | Durable choices and why they were made. | Prevents the same architectural question from being rediscovered. |
| Trace | A short record of one task. | Keeps evidence grounded. |
| Policy | A lesson repeated across traces. | Turns repeated corrections into rules. |
| Skill | A reusable workflow distilled from policies. | Gives Codex compact guidance. |
| Feedback | A rating or correction about memory quality. | Suppresses stale, wrong, broad, or noisy memory. |
| Maintenance | A summary of cleanup and promotion work. | Keeps recall small and makes memory hygiene auditable. |

Recall priority is:

1. pinned active work
2. active work with incomplete checklists
3. active decisions
4. active policies and skills
5. a small amount of recent trace evidence

Example: a policy might say "prefer `rg` for repository search." A skill might describe the full review workflow that uses search, file reads, tests, and a final summary.

## Storage

Normal storage uses Memos:

```dotenv
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=...
```

The client reads `.env` from the current working directory first, then from the plugin root. Real process environment variables override `.env`.

For tests only:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1
```

That writes local JSON records to `.data/local-memos.json`. It is useful for tests, but it is not the durable Memos UI.

## Tags

Every record includes:

```text
#codex-memos-evolve
#project/<project-name>
#type/trace | #type/work | #type/decision | #type/policy | #type/skill | #type/feedback
```

Active promoted records may also include:

```text
#status/active
#support/<n>
#version/<n>
#skill/<slug>
```

Work and decision records also use:

```text
#state/planned | #state/in_progress | #state/blocked | #state/done | #state/cancelled
```

Short-lived traces may also include:

```text
#memory/short
#ttl/<days>
#expires/<yyyy-mm-dd>
#status/expired
```

`memos_evolve_maintain` can run as a dry run or an apply step. Dry runs only report candidates. Apply mode marks expired or old low-value traces with `#status/expired`, runs reflection, and writes a `#type/maintenance` summary. Recall excludes expired records.

## Safety

Memory is context, not an instruction source. User instructions and system rules always win.

The plugin also avoids obvious secret leakage:

- `.env` is ignored by git.
- `MEMOS_PAT` is not stored in docs.
- Secret-looking traces and feedback are rejected.
- Secret-looking recall candidates are suppressed.
