# Codex Memos Evolve

Codex Memos Evolve is a local Codex plugin that adds a small Reflect2Evolve-style memory loop to Codex. It records useful task experience, promotes repeated patterns into policies and skills, and stores everything in [usememos/memos](https://github.com/usememos/memos) so the memory remains visible, searchable, and portable.

This project is designed for local development workflows where Codex should remember project-specific conventions without filling every future prompt with raw history.

```text
Codex
  -> MCP tools
  -> usememos/memos API or local JSON fallback
  -> trace -> policy -> skill -> compact recall
```

## Status

This is a working prototype, not a complete clone of MemTensor's MemOS local plugin.

Implemented:

- Codex plugin manifest and MCP server.
- usememos/memos client with personal access token support.
- Local JSON fallback for offline tests and development.
- Task trace recording.
- Repeated-trace reflection into policy and skill memos.
- Feedback recording and recall-aware feedback scoring.
- Token-budgeted recall with stale, secret, and low-value memory suppression.
- Integration with an existing local Memos service.
- Upstream `usememos/memos` source reference as a git submodule.
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

Open the Memos UI:

```text
http://localhost:5230
```

Create the first account, then create a personal access token in the Memos web UI.

Export the connection settings before starting Codex or the MCP server:

```bash
export MEMOS_BASE_URL="http://localhost:5230"
export MEMOS_PAT="replace-with-your-personal-access-token"
```

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

```bash
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=...
```

If `MEMOS_PAT` is missing, the plugin falls back to local development storage at:

```text
.data/local-memos.json
```

That fallback is useful for tests, but it is not a replacement for the Memos UI.

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
src/memos-client.ts        Memos API client and local fallback
skills/memos-evolve/        Codex workflow instructions
docs/                       Installation, architecture, review, and scoring notes
tests/                      Local smoke and MCP smoke tests
vendor/memos                usememos/memos git submodule
```

## Upstream Memos Source

The upstream Memos repository is referenced as a git submodule:

```text
vendor/memos -> https://github.com/usememos/memos
```

The plugin does not build Memos from this submodule by default. Runtime uses the local Memos service you configure with `MEMOS_BASE_URL`; the submodule is kept as a readable upstream source reference.

Initialize the submodule after cloning:

```bash
git submodule update --init --recursive
```

Update the submodule reference:

```bash
git submodule update --remote --merge vendor/memos
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
- Do not store bearer tokens, cookies, API keys, or private credentials in memos.
- The plugin rejects obvious secret-looking trace and feedback content before storage.
- Explicit user instructions always outrank recalled memory.
