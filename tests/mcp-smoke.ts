import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-memos-evolve-mcp-"));
const mcpConfig = JSON.parse(fs.readFileSync(path.join(root, ".mcp.json"), "utf8")) as {
  mcpServers: {
    "codex-memos-evolve": {
      command: string;
      args?: string[];
      env?: Record<string, string>;
    };
  };
};
const mcpServer = mcpConfig.mcpServers["codex-memos-evolve"];
const mcpArgs = mcpServer.args || [];
assert.ok(
  ["bun", "node"].includes(mcpServer.command) || fs.existsSync(mcpServer.command),
  "MCP command must be bun/node on PATH or an existing executable path"
);
assert.ok(mcpArgs.length >= 1);
assert.ok(mcpArgs[0]);
const serverEntry = mcpArgs[mcpArgs.length - 1];
assert.ok(serverEntry);
assert.ok(fs.existsSync(path.resolve(root, serverEntry)));

const transport = new StdioClientTransport({
  command: mcpServer.command,
  args: mcpArgs,
  cwd: root,
  env: {
    ...process.env,
    ...mcpServer.env,
    MEMOS_EVOLVE_FORCE_LOCAL: "1",
    MEMOS_EVOLVE_LOCAL_FILE: path.join(dir, "memos.json")
  }
});

const client = new Client({ name: "codex-memos-evolve-test", version: "0.1.0" });
await client.connect(transport);

function firstText(result: unknown): string {
  const content = (result as { content?: unknown }).content as Array<{ text?: string }> | undefined;
  return content?.[0]?.text || "";
}

const tools = await client.listTools();
const names = tools.tools.map((tool) => tool.name);
assert.deepEqual(names.sort(), [
  "memos_evolve_feedback",
  "memos_evolve_maintain",
  "memos_evolve_recall",
  "memos_evolve_record_trace",
  "memos_evolve_reflect",
  "memos_evolve_stats"
]);

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

const text = firstText(recall);
assert.match(text, /Memos Evolve Recall/);

const trivial = await client.callTool({
  name: "memos_evolve_recall",
  arguments: {
    project: "mcp-smoke",
    task: "what time is it?",
    maxTokens: 600
  }
});
assert.match(firstText(trivial), /trivial-task-gate/);

const maintenance = await client.callTool({
  name: "memos_evolve_maintain",
  arguments: {
    project: "mcp-smoke",
    apply: false
  }
});
assert.match(firstText(maintenance), /Dry run only/);

await client.close();

console.log(JSON.stringify({ ok: true, tools: names.length }, null, 2));
