import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const root = process.cwd();
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
  mcpServer.command === "node" || fs.existsSync(mcpServer.command),
  "MCP command must be node on PATH or an existing executable path"
);
assert.ok(mcpArgs.length >= 1);
assert.ok(mcpArgs[0]);
const serverEntry = mcpArgs[mcpArgs.length - 1];
assert.ok(serverEntry);
assert.ok(fs.existsSync(path.resolve(root, serverEntry)));

function envWithoutMemos(): Record<string, string> {
  const env = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
  delete env.MEMOS_PAT;
  delete env.MEMOS_BASE_URL;
  delete env.MEMOS_EVOLVE_FORCE_LOCAL;
  delete env.MEMOS_EVOLVE_LOCAL_FILE;
  return env;
}

const discoveryTransport = new StdioClientTransport({
  command: mcpServer.command,
  args: mcpArgs,
  cwd: root,
  env: envWithoutMemos()
});
const discoveryClient = new Client({ name: "codex-memos-evolve-discovery-test", version: "0.1.2" });
await discoveryClient.connect(discoveryTransport);
const discoveryTools = await discoveryClient.listTools();
assert.equal(discoveryTools.tools.length, 4);
await discoveryClient.close();

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

const client = new Client({ name: "codex-memos-evolve-test", version: "0.1.2" });
await client.connect(transport);

function firstText(result: unknown): string {
  const content = (result as { content?: unknown }).content as Array<{ text?: string }> | undefined;
  return content?.[0]?.text || "";
}

const tools = await client.listTools();
const names = tools.tools.map((tool) => tool.name);
assert.deepEqual(names.sort(), [
  "memos_evolve_maintain",
  "memos_evolve_recall",
  "memos_evolve_search",
  "memos_evolve_write"
]);
const searchTool = tools.tools.find((tool) => tool.name === "memos_evolve_search");
assert.ok(searchTool);
const filterSchema = searchTool.inputSchema.properties?.filter;
assert.ok(filterSchema);
assert.equal((filterSchema as { type?: unknown }).type, "string");
assert.ok(!searchTool.inputSchema.required?.includes("filter"));

await client.callTool({
  name: "memos_evolve_write",
  arguments: {
    project: "mcp-smoke",
    recordType: "work",
    summary: "Test MCP work memo",
    goal: "Confirm generic writer can create work records",
    plan: ["Create a work memo", "Recall it"],
    next: "Run recall",
    state: "in_progress",
    pinned: true,
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
assert.match(text, /Active Work/);

const searchIndex = await client.callTool({
  name: "memos_evolve_search",
  arguments: {
    project: "mcp-smoke",
    query: "Test MCP",
    type: "work",
    limit: 5,
    detail: "index"
  }
});
assert.match(firstText(searchIndex), /Search Results/);
assert.match(firstText(searchIndex), /Test MCP work memo/);

const searchFull = await client.callTool({
  name: "memos_evolve_search",
  arguments: {
    project: "mcp-smoke",
    query: "Test MCP",
    type: "work",
    limit: 5,
    detail: "full"
  }
});
assert.match(firstText(searchFull), /## Memo/);
assert.match(firstText(searchFull), /Confirm generic writer can create work records/);

const setup = await client.callTool({
  name: "memos_evolve_maintain",
  arguments: {
    project: "mcp-smoke",
    action: "setup",
    username: "sky"
  }
});
assert.match(firstText(setup), /Active Work|shortcuts/i);

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
