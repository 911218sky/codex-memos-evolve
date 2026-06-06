# Installation

This guide installs Codex Memos Evolve against the existing workspace usememos/memos server.

## Requirements

- Bun 1.3 or newer
- Existing local Memos service
- Codex with MCP plugin support

Check the local toolchain:

```bash
bun --version
```

## Install Dependencies

```bash
git clone https://github.com/911218sky/codex-memos-evolve.git
cd codex-memos-evolve
bun install
```

## Start Existing Memos

Set `MEMOS_HOME` to your local Memos installation:

```bash
export MEMOS_HOME="/path/to/memos"
```

Start it with:

```bash
"$MEMOS_HOME/bin/start.sh"
```

Open the web UI:

```text
http://localhost:5230
```

The existing container is named:

```text
sky-memos
```

It uses:

```text
image: neosmemo/memos:stable
port: 5230
data: $MEMOS_HOME/data -> /var/opt/memos
```

Stop Memos:

```bash
"$MEMOS_HOME/bin/stop.sh"
```

View logs:

```bash
"$MEMOS_HOME/bin/logs.sh"
```

## Create A Personal Access Token

In the Memos web UI, create a personal access token for Codex.

Then export:

```bash
export MEMOS_BASE_URL="http://localhost:5230"
export MEMOS_PAT="replace-with-your-personal-access-token"
```

You can create a local `.env` from the example:

```bash
cp .env.example .env
```

Do not commit the real token. `.env` is ignored by git.

## Run Validation

```bash
bun run validate
```

Expected checks:

- `bun run smoke`
- `bun run mcp:smoke`
- `bun run score`

Validate the Codex plugin manifest:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

## Run MCP Server Manually

```bash
bun start
```

The server speaks MCP over stdio, so it will wait for an MCP client. For a direct local check, use:

```bash
bun run mcp:smoke
```

## Codex Plugin Files

The project is structured as a Codex plugin:

```text
.codex-plugin/plugin.json
.mcp.json
skills/memos-evolve/SKILL.md
src/mcp-server.ts
```

The MCP server exposes:

```text
memos_evolve_recall
memos_evolve_record_trace
memos_evolve_reflect
memos_evolve_feedback
memos_evolve_stats
```

For the Codex-side installation flow, see [Codex Installation](codex-install.md).

## Use The Memory Viewer

Open:

```text
http://localhost:5230
```

Search for:

```text
#codex-memos-evolve
```

Useful filters:

```text
#project/<project-name>
#type/trace
#type/policy
#type/skill
#type/feedback
#status/active
```

## Upstream Memos Submodule

The upstream usememos/memos source is referenced at:

```text
vendor/memos
```

It points to:

```text
https://github.com/usememos/memos
```

After a fresh clone:

```bash
git submodule update --init --recursive
```

Update the submodule:

```bash
git submodule update --remote --merge vendor/memos
```

Runtime does not build from this submodule by default. Runtime uses the local Memos service you configure with `MEMOS_BASE_URL`.

## Local Fallback Mode

If `MEMOS_PAT` is not set, the plugin writes to:

```text
.data/local-memos.json
```

This is useful for tests and offline development. It does not provide the Memos web UI.

## Current Limitation

Codex does not automatically call task-start and task-end lifecycle hooks for this project yet. The included `memos-evolve` skill describes when Codex should call recall, trace recording, reflection, feedback, and stats.
