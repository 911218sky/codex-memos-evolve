import fs from "node:fs";
import path from "node:path";
import type { MemoRecord, MemosClientOptions, StorageMode } from "./types.ts";

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeBaseUrl(url?: string): string {
  return (url || "http://localhost:5230").replace(/\/+$/, "");
}

function memoIdFromName(name?: string): string {
  if (!name) return "";
  return String(name).split("/").pop() || "";
}

export class MemosClient {
  readonly baseUrl: string;
  readonly token: string;
  readonly localFile: string;
  readonly forceLocal: boolean;

  constructor(options: MemosClientOptions = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.MEMOS_BASE_URL);
    this.token = options.token || process.env.MEMOS_PAT || "";
    this.localFile = path.resolve(options.localFile || process.env.MEMOS_EVOLVE_LOCAL_FILE || "./.data/local-memos.json");
    this.forceLocal = Boolean(options.forceLocal || process.env.MEMOS_EVOLVE_FORCE_LOCAL === "1");
  }

  get mode(): StorageMode {
    return this.token && !this.forceLocal ? "memos-api" : "local-json";
  }

  async createMemo(content: string, visibility = "PRIVATE"): Promise<MemoRecord> {
    if (this.mode === "local-json") return this.#createLocal(content, visibility);
    const res = await fetch(`${this.baseUrl}/api/v1/memos`, {
      method: "POST",
      headers: this.#headers(),
      body: JSON.stringify({ content, visibility })
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Memos create failed ${res.status}: ${message}`);
    }
    return res.json() as Promise<MemoRecord>;
  }

  async searchMemos(query: string, pageSize = 50): Promise<MemoRecord[]> {
    if (this.mode === "local-json") return this.#searchLocal(query, pageSize);
    const url = new URL(`${this.baseUrl}/api/v1/memos`);
    url.searchParams.set("pageSize", String(pageSize));
    if (query) {
      url.searchParams.set("filter", `content.contains("${String(query).replaceAll('"', '\\"')}")`);
    }
    const res = await fetch(url, { headers: this.#headers(false) });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Memos list/search failed ${res.status}: ${message}`);
    }
    const body = await res.json() as { memos?: MemoRecord[]; items?: MemoRecord[] } | MemoRecord[];
    if (Array.isArray(body)) return body;
    return body.memos || body.items || [];
  }

  async listPluginMemos(pageSize = 200): Promise<MemoRecord[]> {
    return this.searchMemos("#codex-memos-evolve", pageSize);
  }

  #headers(hasBody = true): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.token}`
    };
    if (hasBody) headers["Content-Type"] = "application/json";
    return headers;
  }

  #readLocal(): MemoRecord[] {
    if (!fs.existsSync(this.localFile)) return [];
    return JSON.parse(fs.readFileSync(this.localFile, "utf8")) as MemoRecord[];
  }

  #writeLocal(items: MemoRecord[]): void {
    fs.mkdirSync(path.dirname(this.localFile), { recursive: true });
    fs.writeFileSync(this.localFile, `${JSON.stringify(items, null, 2)}\n`);
  }

  #createLocal(content: string, visibility: string): MemoRecord {
    const items = this.#readLocal();
    const id = String(items.length + 1);
    const memo = {
      name: `memos/${id}`,
      id,
      uid: Number(id),
      content,
      visibility,
      createTime: nowIso(),
      updateTime: nowIso()
    };
    items.unshift(memo);
    this.#writeLocal(items);
    return memo;
  }

  #searchLocal(query: string, pageSize: number): MemoRecord[] {
    const haystack = this.#readLocal();
    const needles = String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const filtered = needles.length
      ? haystack.filter((memo) => needles.every((term) => String(memo.content || "").toLowerCase().includes(term)))
      : haystack;
    return filtered.slice(0, pageSize).map((memo) => ({ ...memo, id: memoIdFromName(memo.name) }));
  }
}
