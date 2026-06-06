# Installation

This guide installs Codex Memos Evolve against the existing workspace usememos/memos server.

## Requirements

- Node.js 18 or newer
- npm
- Existing Memos service at `/home/sbplab/sky/.tools/memos`
- Codex with MCP plugin support

Check the local toolchain:

```bash
node --version
npm --version
```

## Install Dependencies

```bash
cd /home/sbplab/sky/codex-memos-evolve
npm install
```

## Start Existing Memos

This workspace already runs Memos from:

```text
/home/sbplab/sky/.tools/memos
```

Start it with:

```bash
/home/sbplab/sky/.tools/memos/bin/start.sh
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
data: /home/sbplab/sky/.tools/memos/data -> /var/opt/memos
```

Stop Memos:

```bash
/home/sbplab/sky/.tools/memos/bin/stop.sh
```

View logs:

```bash
/home/sbplab/sky/.tools/memos/bin/logs.sh
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
npm run validate
```

Expected checks:

- `npm run smoke`
- `npm run mcp:smoke`
- `npm run score`

Validate the Codex plugin manifest:

```bash
python3 /home/sbplab/sky/.tools/codex/config/skills/.system/plugin-creator/scripts/validate_plugin.py /home/sbplab/sky/codex-memos-evolve
```

## Run MCP Server Manually

```bash
npm start
```

The server speaks MCP over stdio, so it will wait for an MCP client. For a direct local check, use:

```bash
npm run mcp:smoke
```

## Codex Plugin Files

The project is structured as a Codex plugin:

```text
.codex-plugin/plugin.json
.mcp.json
skills/memos-evolve/SKILL.md
src/mcp-server.mjs
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

Runtime does not build from this submodule by default. Runtime uses the existing workspace Memos service in `/home/sbplab/sky/.tools/memos`.

## Local Fallback Mode

If `MEMOS_PAT` is not set, the plugin writes to:

```text
.data/local-memos.json
```

This is useful for tests and offline development. It does not provide the Memos web UI.

## Current Limitation

Codex does not automatically call task-start and task-end lifecycle hooks for this project yet. The included `memos-evolve` skill describes when Codex should call recall, trace recording, reflection, feedback, and stats.
