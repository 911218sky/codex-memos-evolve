# Installation

Use this guide when you want to run the plugin against a real Memos server.

## 1. Check Requirements

You need:

- Node.js 18 or newer
- Codex with MCP plugin support
- A running Memos server
- A Memos personal access token

Node.js is used for local development, validation scripts, and the installed Codex MCP server.

Check Node:

```bash
node --version
```

Check that your Codex CLI has plugin commands:

```bash
codex plugin --help
```

## 2. Install The Plugin

```bash
git clone https://github.com/911218sky/codex-memos-evolve.git
cd codex-memos-evolve
npm install
```

## 3. Start Memos

Memos is an external dependency. Install it from:

```text
https://github.com/usememos/memos
```

Then open the web UI:

```text
http://localhost:5230
```

If this workspace uses the existing `sky-memos` setup, the usual helper commands are:

```bash
"$MEMOS_HOME/bin/start.sh"
"$MEMOS_HOME/bin/logs.sh"
"$MEMOS_HOME/bin/stop.sh"
```

## 4. Create `.env`

Create a Memos personal access token in the Memos web UI. In most Memos builds, open your user settings or profile menu, then look for the access token section. The token is the value used for `MEMOS_PAT`.

Then configure the plugin:

```bash
cp .env.example .env
$EDITOR .env
```

Set:

```dotenv
MEMOS_BASE_URL=http://localhost:5230
MEMOS_PAT=<your-personal-access-token>
```

Do not commit `.env`. It is ignored by git.

## 5. Validate

```bash
npm run validate
```

This runs:

- TypeScript typecheck
- local smoke test
- MCP smoke test
- project score script

Validate the Codex plugin manifest:

```bash
python3 "$CODEX_HOME/skills/.system/plugin-creator/scripts/validate_plugin.py" "$PWD"
```

If `CODEX_HOME` is not set, it usually means your Codex configuration directory. Common values are `~/.codex` or another runtime-specific config directory.

## 6. Manual MCP Check

For the MCP path only:

```bash
npm run mcp:smoke
```

If Codex reports MCP startup incomplete, continue with [Codex Installation](codex-install.md#6-if-mcp-startup-is-incomplete).

For a raw stdio server:

```bash
node ./dist/src/mcp-server.js
```

The raw stdio server waits for an MCP client, so no prompt is expected.

## 7. View Records

Open Memos:

```text
http://localhost:5230
```

Search:

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

## Local Test Mode

Normal mode requires `MEMOS_PAT`.

Use local JSON only for tests or offline development:

```bash
MEMOS_EVOLVE_FORCE_LOCAL=1 npm run validate
```

Local records are written to `.data/local-memos.json` and will not appear in the Memos web UI.
