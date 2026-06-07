# Codex Memos Evolve

Codex Memos Evolve is a local Codex plugin that gives Codex a small long-term memory loop.

It stores useful task traces in [usememos/memos](https://github.com/usememos/memos), then turns repeated lessons into compact policies and skills that Codex can recall later.

![Codex Memos Evolve architecture](assets/codex-memos-evolve-architecture.png)

## What It Does

| Step | Result |
| --- | --- |
| Recall | Codex asks for relevant memory before reusable work. |
| Record | Completed work is saved as a short trace in Memos. |
| Reflect | Repeated traces become policies and skill memos. |
| Reuse | Future tasks get compact guidance instead of raw history. |

This is a working prototype. It does not implement a full memory operating system and it does not yet have automatic Codex lifecycle hooks.

The plugin now makes proactive recall the default instructed behavior for non-trivial work, and this repo includes an `AGENTS.md` instruction file with the same rule. Codex runtime still decides whether a tool is exposed and selected in each session. For stronger project-level behavior in other repos, copy the snippet in [Proactive Use](docs/proactive-use.md) to that workspace's `AGENTS.md`.

## Requirements

- Bun 1.3 or newer
- Codex with plugin and MCP support
- A running Memos server
- A Memos personal access token for `MEMOS_PAT`

This repo does not install Memos. Install and start Memos first from the upstream project.

To confirm your Codex CLI supports plugins, run:

```bash
codex plugin --help
```

If that command is missing, use a Codex build or surface that includes plugin and MCP support.

## Quick Start

1. Install dependencies:

```bash
git clone https://github.com/911218sky/codex-memos-evolve.git
cd codex-memos-evolve
bun install
```

2. Create `.env`:

```bash
cp .env.example .env
$EDITOR .env
```

Set:

```dotenv
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=<your-personal-access-token>
```

3. Validate:

```bash
bun run validate
```

4. Install or refresh the Codex plugin:

```bash
codex plugin add codex-memos-evolve@sky-tools
```

This assumes your Codex setup exposes this plugin through the local or personal `sky-tools` marketplace.

For another local marketplace:

```bash
codex plugin marketplace add /path/to/marketplace
codex plugin add codex-memos-evolve@<marketplace-name>
```

`codex plugin add` installs from a configured marketplace snapshot. It does not install an arbitrary repository folder directly.

If you need to make a tiny local marketplace from this clone:

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

Start a new Codex thread after reinstalling so MCP tools and skills reload.

## MCP Tools

| Tool | Use |
| --- | --- |
| `memos_evolve_recall` | Get compact memory for the current task. |
| `memos_evolve_record_trace` | Save a grounded task trace. |
| `memos_evolve_reflect` | Promote repeated traces into policies and skills. |
| `memos_evolve_feedback` | Mark memory as useful, wrong, stale, or noisy. |
| `memos_evolve_stats` | Show counts and rough token savings. |

You normally do not call these directly. The `memos-evolve` skill tells Codex when to use them.

## Common Checks

If Codex says MCP startup is incomplete:

```bash
bun run mcp:smoke
```

Then check:

- Memos is reachable at `MEMOS_BASE_URL`.
- `.env` is in the same folder as `.codex-plugin/plugin.json`.
- `MEMOS_PAT` is set and valid.
- The plugin was reinstalled after source or manifest changes.
- A new Codex thread was opened after reinstalling.

| `bun run mcp:smoke` result | Next step |
| --- | --- |
| Passes and lists 5 tools | Reinstall or refresh the plugin, then open a new Codex thread. |
| `MEMOS_PAT is required` | Fix `.env` or export `MEMOS_PAT` in the process that starts Codex. |
| Connection refused | Start Memos or fix `MEMOS_BASE_URL`. |
| Tools still absent in Codex | Reinstall the plugin and confirm Codex is using the expected plugin root. |

The MCP client now looks for `.env` in the current working directory and in the plugin root, so it is less sensitive to where Codex starts the server.

## Local Test Mode

Normal mode requires `MEMOS_PAT`. Missing tokens fail fast.

For tests only:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1 bun run validate
```

Local mode writes to `.data/local-memos.json`. Those records do not appear in the Memos web UI.

## Documentation

- [Installation](docs/install.md)
- [Codex Installation](docs/codex-install.md)
- [Proactive Use](docs/proactive-use.md)
- [Architecture](docs/architecture.md)
- [Evaluation Rubric](docs/evaluation-rubric.md)
- [Subagent Review](docs/subagent-review.md)

## Repository Layout

```text
.codex-plugin/plugin.json   Codex plugin manifest
.mcp.json                   MCP server configuration
AGENTS.md                   Repository instruction for proactive memory use
assets/                     Markdown images
docs/                       Install, architecture, and review notes
skills/memos-evolve/        Codex workflow instructions
src/mcp-server.ts           MCP tool definitions
src/evolver.ts              Recall, reflection, feedback, and stats
src/memos-client.ts         Memos API client and local test mode
tests/                      Local smoke and MCP smoke tests
```

## Security

- Do not commit `.env`.
- Do not print or commit `MEMOS_PAT`.
- Do not store bearer tokens, cookies, API keys, or private credentials in memos.
- Explicit user instructions always outrank recalled memory.
