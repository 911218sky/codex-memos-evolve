#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_name="${CODEX_PLUGIN_NAME:-codex-memos-evolve}"
marketplace="${CODEX_PLUGIN_MARKETPLACE:-sky-tools}"
plugin_workdir="${CODEX_PLUGIN_WORKDIR:-}"
version="$(node -p "JSON.parse(require('node:fs').readFileSync(process.argv[1], 'utf8')).version" "$repo_root/package.json")"

if [[ -z "$plugin_workdir" ]]; then
  current="$repo_root"
  while true; do
    candidate="$current/.tools/codex/config/plugins/cache/$marketplace/$plugin_name"
    if [[ -d "$candidate" ]]; then
      plugin_workdir="$current"
      break
    fi
    parent="$(dirname "$current")"
    if [[ "$parent" == "$current" ]]; then
      plugin_workdir="$repo_root"
      break
    fi
    current="$parent"
  done
fi

installed_root="${CODEX_PLUGIN_INSTALLED_ROOT:-$plugin_workdir/.tools/codex/config/plugins/cache/$marketplace/$plugin_name}"
installed_path="${CODEX_PLUGIN_INSTALLED_PATH:-$plugin_workdir/.tools/codex/config/plugins/cache/$marketplace/$plugin_name/$version}"
mkdir -p "$installed_root" "$installed_path"

cd "$repo_root"
npm run build

rsync -a --delete \
  --exclude ".git" \
  --exclude "node_modules" \
  --exclude ".DS_Store" \
  "$repo_root/" "$installed_path/"

cd "$installed_path"
npm install
npm run mcp:smoke
cache_smoke="$(node ./dist/tests/mcp-smoke.js)"

node -e '
const data = JSON.parse(process.argv[1]);
const result = {
  ok: true,
  plugin: process.argv[2],
  pluginWorkdir: process.argv[3],
  installedRoot: process.argv[4],
  installedPath: process.argv[5],
  tools: data.tools
};
console.log(JSON.stringify(result, null, 2));
' "$cache_smoke" "$plugin_name@$marketplace" "$plugin_workdir" "$installed_root" "$installed_path"
