# Codex Installation

This guide explains how to make Codex use `codex-memos-evolve` with the existing workspace Memos service.

## 1. Prepare The Project

```bash
cd /path/to/codex-memos-evolve
bun install
bun run validate
```

Validate the plugin manifest:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

## 2. Start Existing Memos

```bash
"$MEMOS_HOME/bin/start.sh"
```

Open:

```text
http://localhost:5230
```

Use the existing Memos account and create a personal access token if needed.

## 3. Export Runtime Environment

Codex must be able to pass these variables to the MCP server:

```bash
export MEMOS_BASE_URL="http://localhost:5230"
export MEMOS_PAT="replace-with-your-personal-access-token"
export MEMOS_EVOLVE_LOCAL_FILE="$PWD/.data/local-memos.json"
```

`MEMOS_PAT` is required for real Memos storage. Without it, the plugin falls back to local JSON storage and the records will not appear in the Memos web UI.

Do not commit the real token.

## 4. Install Or Load The Plugin In Codex

The plugin root is:

```text
/path/to/codex-memos-evolve
```

The Codex plugin manifest is:

```text
/path/to/codex-memos-evolve/.codex-plugin/plugin.json
```

The manifest points Codex to:

```text
skills/
.mcp.json
```

If your Codex build supports local plugin installation from a folder, install this project folder as the plugin source.

If your Codex setup uses a local marketplace, add this folder as the source for plugin name:

```text
codex-memos-evolve
```

The MCP server command declared by the plugin is:

```json
{
  "command": "bun",
  "args": ["./src/mcp-server.ts"]
}
```

Codex should run that command from the plugin root.

## 5. Manual MCP Fallback

If Codex cannot load the plugin UI yet, you can still verify the MCP server directly:

```bash
cd /path/to/codex-memos-evolve
bun run mcp:smoke
```

For a manual stdio server run:

```bash
bun start
```

The process will wait for an MCP client.

## 6. Confirm Tools Are Available

After Codex loads the plugin, the following MCP tools should be available:

```text
memos_evolve_recall
memos_evolve_record_trace
memos_evolve_reflect
memos_evolve_feedback
memos_evolve_stats
```

The included Codex skill is:

```text
memos-evolve
```

It tells Codex when to recall memory, record traces, run reflection, record feedback, and inspect stats.

## 7. Expected Workflow In Codex

Before a reusable task:

```text
Call memos_evolve_recall with the project name and current task.
```

After useful work:

```text
Call memos_evolve_record_trace with grounded observations and corrections.
```

After repeated related traces:

```text
Call memos_evolve_reflect with minSupport=2 or higher.
```

When a memory is wrong or useful:

```text
Call memos_evolve_feedback with the target and rating.
```

For inspection:

```text
Call memos_evolve_stats for the project.
```

## 8. Check The Memos Page

Open:

```text
http://localhost:5230
```

Search:

```text
#codex-memos-evolve
```

If no records appear:

- Confirm `MEMOS_PAT` is exported in the environment where Codex starts.
- Confirm `MEMOS_BASE_URL` is `http://localhost:5230`.
- Confirm the Memos container is running.
- Run `bun run mcp:smoke` from the plugin root.

## 9. Troubleshooting

Check Memos:

```bash
docker ps --filter name=sky-memos
"$MEMOS_HOME/bin/logs.sh"
```

Check plugin validation:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

Check MCP smoke:

```bash
bun run mcp:smoke
```

Check local fallback data:

```text
.data/local-memos.json
```

If fallback data exists but Memos has no records, Codex likely started without `MEMOS_PAT`.
