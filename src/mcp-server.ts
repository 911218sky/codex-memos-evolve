#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemosClient } from "./memos-client.ts";
import { EvolveEngine } from "./evolver.ts";

const client = new MemosClient();
const engine = new EvolveEngine(client);

const server = new McpServer({
  name: "codex-memos-evolve",
  version: "0.1.0"
});

server.tool(
  "memos_evolve_recall",
  "Return compact, token-aware Memos guidance for the current Codex task.",
  {
    task: z.string().describe("Current task or user request."),
    project: z.string().default("default").describe("Project or repository name."),
    maxTokens: z.number().int().min(200).max(4000).default(1400).describe("Approximate token budget for recall output.")
  },
  async (input) => jsonResult(await engine.recall(input))
);

server.tool(
  "memos_evolve_record_trace",
  "Store a grounded task trace in usememos/memos for later promotion into policies and skills.",
  {
    project: z.string().default("default"),
    task: z.string(),
    outcome: z.string().default(""),
    observations: z.array(z.string()).default([]),
    corrections: z.array(z.string()).default([]),
    value: z.number().min(-10).max(10).default(0),
    tags: z.array(z.string()).default([])
  },
  async (input) => jsonResult(await engine.recordTrace(input))
);

server.tool(
  "memos_evolve_reflect",
  "Promote repeated traces into compact policy and skill memos.",
  {
    project: z.string().default("default"),
    minSupport: z.number().int().min(2).max(20).default(2)
  },
  async (input) => jsonResult(await engine.reflect(input))
);

server.tool(
  "memos_evolve_feedback",
  "Record human or agent feedback about an evolved memory, policy, or skill.",
  {
    project: z.string().default("default"),
    target: z.string().describe("Memo name, skill slug, or policy title."),
    rating: z.number().int().min(-5).max(5),
    comment: z.string().default("")
  },
  async (input) => jsonResult(await engine.feedback(input))
);

server.tool(
  "memos_evolve_stats",
  "Summarize trace/policy/skill counts and rough token compression.",
  {
    project: z.string().default("default")
  },
  async (input) => jsonResult(await engine.stats(input))
);

const transport = new StdioServerTransport();
await server.connect(transport);

function jsonResult(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
