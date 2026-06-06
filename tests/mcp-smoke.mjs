import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-mcp-"));
const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(root, "src/mcp-server.mjs")],
  env: {
    ...process.env,
    MEMOS_EVOLVE_FORCE_LOCAL: "1",
    MEMOS_EVOLVE_LOCAL_FILE: path.join(dir, "memos.json")
  }
});

const client = new Client({ name: "codex-memos-evolve-test", version: "0.1.0" });
await client.connect(transport);

const tools = await client.listTools();
const names = tools.tools.map((tool) => tool.name);
assert.ok(names.includes("memos_evolve_recall"));
assert.ok(names.includes("memos_evolve_record_trace"));
assert.ok(names.includes("memos_evolve_reflect"));

await client.callTool({
  name: "memos_evolve_record_trace",
  arguments: {
    project: "mcp-smoke",
    task: "Test MCP tool invocation",
    outcome: "Tool call worked",
    observations: ["MCP client can call server"],
    corrections: ["Keep recall compact"],
    value: 3,
    tags: ["mcp", "plugin"]
  }
});

const recall = await client.callTool({
  name: "memos_evolve_recall",
  arguments: {
    project: "mcp-smoke",
    task: "Use MCP plugin memory",
    maxTokens: 600
  }
});

const text = recall.content?.[0]?.text || "";
assert.match(text, /Memos Evolve Recall/);

const trivial = await client.callTool({
  name: "memos_evolve_recall",
  arguments: {
    project: "mcp-smoke",
    task: "what time is it?",
    maxTokens: 600
  }
});
assert.match(trivial.content?.[0]?.text || "", /trivial-task-gate/);

await client.close();

console.log(JSON.stringify({ ok: true, tools: names.length }, null, 2));
