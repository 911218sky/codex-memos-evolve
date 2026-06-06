# Codex Memos Evolve

Codex Memos Evolve is a local Codex plugin that adds a small Reflect2Evolve-style memory loop to Codex. It records useful task experience, promotes repeated patterns into policies and skills, and stores everything in [usememos/memos](https://github.com/usememos/memos) so the memory remains visible, searchable, and portable.

This project is designed for local development workflows where Codex should remember project-specific conventions without filling every future prompt with raw history.

```text
Codex
  -> MCP tools
  -> usememos/memos API
  -> trace -> policy -> skill -> compact recall
```

## Status

This is a working prototype, not a complete clone of MemTensor's MemOS local plugin.

Implemented:

- Codex plugin manifest and MCP server.
- usememos/memos client with personal access token support.
- Explicit local JSON mode for offline tests and development.
- Task trace recording.
- Repeated-trace reflection into policy and skill memos.
- Feedback recording and recall-aware feedback scoring.
- Token-budgeted recall with stale, secret, and low-value memory suppression.
- Integration with an existing local Memos service.
- Smoke tests, MCP smoke test, and project scoring script.

Not implemented yet:

- Automatic Codex task-start and task-end lifecycle hooks.
- Dedicated dashboard beyond the normal Memos web UI.
- Embedding or LLM-based clustering.
- Automatic installation of generated skill memos into Codex skill folders.
- Long-history stress testing against hundreds of traces.

## Why This Exists

Raw conversation history is expensive, noisy, and often too specific. This plugin separates memory into layers:

- **Trace**: grounded record of what happened in a task.
- **Policy**: repeated lesson promoted from multiple traces.
- **Skill**: reusable workflow distilled from stable policies.
- **Feedback**: user or agent judgement about whether a memory is useful, wrong, stale, or too broad.

The recall path favors compact policies and skills over raw traces, so repeated work should become cheaper and more consistent over time.

## Quick Start

Install dependencies:

```bash
git clone https://github.com/911218sky/codex-memos-evolve.git
cd codex-memos-evolve
bun install
```

Start your local Memos service:

```bash
$MEMOS_HOME/bin/start.sh
```

If Memos is not installed yet, install it from the upstream repository first:

```text
https://github.com/usememos/memos
```

Follow the upstream Memos installation instructions, then make sure the web UI is reachable at `http://localhost:5230` or set `MEMOS_BASE_URL` to your Memos URL.

Open the Memos UI:

```text
http://localhost:5230
```

Create the first account, then create a personal access token in the Memos web UI.

Create a local `.env` before starting Codex or the MCP server:

```bash
cp .env.example .env
$EDITOR .env
```

Set `MEMOS_PAT` in `.env` to the personal access token from the Memos web UI.

Run validation:

```bash
bun run validate
```

Install or load the plugin in Codex:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

Then follow the Codex-side installation notes in [Codex Installation](docs/codex-install.md).

Run the MCP server manually:

```bash
bun start
```

When run directly, the server speaks MCP over stdio and waits for an MCP client.

## MCP Tools

| Tool | Purpose |
| --- | --- |
| `memos_evolve_recall` | Return compact, token-aware guidance for the current task. |
| `memos_evolve_record_trace` | Store a grounded task trace for later reflection. |
| `memos_evolve_reflect` | Promote repeated traces into policy and skill memos. |
| `memos_evolve_feedback` | Record feedback about a memory, policy, or skill. |
| `memos_evolve_stats` | Summarize counts and rough token compression estimates. |

## Memos Integration

Runtime storage uses a Memos server configured with:

```dotenv
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=...
```

The plugin reads these values from the plugin root `.env` file, or from environment variables passed by the process that starts Codex. Environment variables override `.env` values.

`MEMOS_PAT` is required by default. If it is missing, the MCP server fails fast instead of silently writing somewhere else.

For explicit local tests or development only, set:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1
```

That mode writes local development storage at:

```text
.data/local-memos.json
```

Local mode is useful for tests, but it is not a replacement for the Memos UI.

## Memory Tags

Every stored record includes:

- `#codex-memos-evolve`
- `#project/<project-name>`
- one type tag such as `#type/trace`, `#type/policy`, `#type/skill`, or `#type/feedback`

Reflection can add:

- `#support/<n>`
- `#version/<n>`
- `#skill/<slug>`
- `#status/active`

Useful Memos searches:

```text
#codex-memos-evolve
#project/<project-name>
#type/trace
#type/policy
#type/skill
#status/active
```

## Visible UI

The current UI is the standard Memos web app. Because all memory is stored as tagged Markdown memos, the Memos page acts as the first memory viewer.

This means you can inspect, search, edit, and delete memory from:

```text
http://localhost:5230
```

A dedicated dashboard can be added later on top of the same tags and API.

## Repository Layout

```text
.codex-plugin/plugin.json   Codex plugin manifest
.mcp.json                   MCP server configuration
src/mcp-server.ts          MCP tool definitions
src/evolver.ts             Recall, reflection, feedback, and stats logic
src/memos-client.ts        Memos API client and explicit local test mode
skills/memos-evolve/        Codex workflow instructions
docs/                       Installation, architecture, review, and scoring notes
tests/                      Local smoke and MCP smoke tests
```

## Documentation

- [Installation](docs/install.md)
- [Codex Installation](docs/codex-install.md)
- [Architecture](docs/architecture.md)
- [Evaluation Rubric](docs/evaluation-rubric.md)
- [Subagent Review](docs/subagent-review.md)

## Verification

```bash
bun run validate
```

This runs:

- local memory smoke test
- MCP smoke test
- project scoring script

Codex plugin manifest validation:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

## Security Notes

- Do not commit `MEMOS_PAT`.
- Do not commit `.env`; use `.env.example` for safe placeholders.
- Do not store bearer tokens, cookies, API keys, or private credentials in memos.
- The plugin rejects obvious secret-looking trace and feedback content before storage.
- Explicit user instructions always outrank recalled memory.
