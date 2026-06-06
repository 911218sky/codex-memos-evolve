# Codex Installation

Use this guide when Memos and the plugin already validate locally, but Codex still needs to load the plugin.

## 1. Validate First

From the plugin root:

```bash
bun install
bun run validate
```

Validate the manifest:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

If `CODEX_HOME` is not set, use the Codex home for the Codex process you are testing. For this workspace, that is usually `/home/sbplab/sky/.tools/codex/config`.

## 2. Confirm `.env`

The plugin root must contain:

```dotenv
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=<your-personal-access-token>
```

`MEMOS_PAT` is required in normal mode. Without it, the MCP server fails fast so records are not silently written outside Memos.

Put `.env` in the same folder as `.codex-plugin/plugin.json`.

The MCP client looks for `.env` in:

1. the current working directory
2. the plugin root

Process environment variables still override `.env`.

## 3. Install Or Refresh The Plugin

For the `sky-tools` marketplace:

```bash
codex plugin add codex-memos-evolve@sky-tools
```

For other Codex setups, first add the marketplace that contains this plugin:

```bash
codex plugin marketplace add /path/to/marketplace
codex plugin add codex-memos-evolve@<marketplace-name>
```

`codex plugin add` installs from a configured marketplace snapshot. It does not install an arbitrary repository folder directly.

If you only have this cloned repository, create a small local marketplace:

```bash
mkdir -p /path/to/marketplace/plugins
ln -s "$PWD" /path/to/marketplace/plugins/codex-memos-evolve
mkdir -p /path/to/marketplace/.agents/plugins
```

Create `/path/to/marketplace/.agents/plugins/marketplace.json`:

```json
{
  "name": "local-tools",
  "plugins": [
    {
      "name": "codex-memos-evolve",
      "source": {
        "source": "local",
        "path": "./plugins/codex-memos-evolve"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

Then install it:

```bash
codex plugin marketplace add /path/to/marketplace
codex plugin add codex-memos-evolve@local-tools
```

The manifest is:

```text
.codex-plugin/plugin.json
```

It points Codex to:

```text
skills/
.mcp.json
```

The MCP command is:

```json
{
  "command": "bun",
  "args": ["./src/mcp-server.ts"]
}
```

Codex should run this command from the plugin root. If relative paths do not resolve, refresh the plugin install so Codex uses the expected root.

Open a new Codex thread after reinstalling.

## 4. Confirm Tools

Codex should load these MCP tools:

```text
memos_evolve_recall
memos_evolve_record_trace
memos_evolve_reflect
memos_evolve_feedback
memos_evolve_stats
```

It should also load the skill:

```text
memos-evolve
```

Look for these in the active MCP tool list for a new Codex thread, or ask Codex to list available MCP tools if your surface supports that.

If your surface does not expose the active tool list, use two checks:

```bash
codex mcp list
bun run mcp:smoke
```

`codex mcp list` confirms Codex knows about enabled MCP servers. `bun run mcp:smoke` confirms this plugin's MCP server starts and lists 5 tools.

## 5. If MCP Startup Is Incomplete

Run from the plugin root:

```bash
bun run mcp:smoke
```

Then check:

- Memos is running at `MEMOS_BASE_URL`.
- `.env` is in the same folder as `.codex-plugin/plugin.json`.
- `MEMOS_PAT` is valid.
- The plugin was refreshed after edits.
- The Codex thread was restarted.

| `bun run mcp:smoke` result | Meaning | Next step |
| --- | --- | --- |
| Passes and lists 5 tools | The plugin MCP server works locally. | Reinstall or refresh the plugin, then open a new Codex thread. |
| `MEMOS_PAT is required` | The token is missing from `.env` or the Codex process environment. | Fix `.env` or export `MEMOS_PAT`. |
| Connection refused | Memos is not reachable. | Start Memos or correct `MEMOS_BASE_URL`. |
| Codex still shows no tools | Codex is using an old plugin cache or wrong root. | Reinstall the plugin and confirm the installed plugin path. |

To inspect configured marketplaces:

```bash
codex plugin marketplace list
```

To inspect installed plugin cache paths, check the plugin cache under your active `CODEX_HOME`, for example:

```bash
find "$CODEX_HOME/plugins/cache" -maxdepth 4 -type d -name codex-memos-evolve
```

If `codex_apps` also fails with `401 token_invalidated`, that is separate from this plugin. Check the Codex login context that starts the app server and sign in again if needed.
