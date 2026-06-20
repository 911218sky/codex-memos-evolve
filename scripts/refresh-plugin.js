#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const defaultPlugin = process.env.CODEX_PLUGIN_NAME || "codex-memos-evolve";

export function resolvePluginWorkdir({ root, pluginName, explicitWorkdir } = {}) {
  if (explicitWorkdir) return path.resolve(explicitWorkdir);

  let current = path.resolve(root || process.cwd());
  const marketplace = process.env.CODEX_PLUGIN_MARKETPLACE || "sky-tools";
  while (true) {
    const candidate = path.join(
      current,
      ".tools",
      "codex",
      "config",
      "plugins",
      "cache",
      marketplace,
      pluginName || defaultPlugin
    );
    if (fs.existsSync(candidate)) return current;
    const parent = path.dirname(current);
    if (parent === current) return path.resolve(root || process.cwd());
    current = parent;
  }
}

export function main() {
  const plugin = process.env.CODEX_PLUGIN_NAME || defaultPlugin;
  const marketplace = process.env.CODEX_PLUGIN_MARKETPLACE || "sky-tools";
  const pluginWorkdir = resolvePluginWorkdir({
    root: process.cwd(),
    pluginName: plugin,
    explicitWorkdir: process.env.CODEX_PLUGIN_WORKDIR
  });
  console.log(JSON.stringify({
    ok: true,
    plugin: `${plugin}@${marketplace}`,
    pluginWorkdir
  }, null, 2));
}
