import fs from "node:fs";
import path from "node:path";

function nowIso() {
  return new Date().toISOString();
}

function normalizeBaseUrl(url) {
  return (url || "http://localhost:5230").replace(/\/+$/, "");
}

function memoIdFromName(name) {
  if (!name) return "";
  return String(name).split("/").pop();
}

export class MemosClient {
  constructor(options = {}) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.MEMOS_BASE_URL);
    this.token = options.token || process.env.MEMOS_PAT || "";
    this.localFile = path.resolve(options.localFile || process.env.MEMOS_EVOLVE_LOCAL_FILE || "./.data/local-memos.json");
    this.forceLocal = Boolean(options.forceLocal || process.env.MEMOS_EVOLVE_FORCE_LOCAL === "1");
  }

  get mode() {
    return this.token && !this.forceLocal ? "memos-api" : "local-json";
  }

  async createMemo(content, visibility = "PRIVATE") {
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
    return res.json();
  }

  async searchMemos(query, pageSize = 50) {
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
    const body = await res.json();
    return body.memos || body.items || body;
  }

  async listPluginMemos(pageSize = 200) {
    return this.searchMemos("#codex-memos-evolve", pageSize);
  }

  #headers(hasBody = true) {
    const headers = {
      Authorization: `Bearer ${this.token}`
    };
    if (hasBody) headers["Content-Type"] = "application/json";
    return headers;
  }

  #readLocal() {
    if (!fs.existsSync(this.localFile)) return [];
    return JSON.parse(fs.readFileSync(this.localFile, "utf8"));
  }

  #writeLocal(items) {
    fs.mkdirSync(path.dirname(this.localFile), { recursive: true });
    fs.writeFileSync(this.localFile, `${JSON.stringify(items, null, 2)}\n`);
  }

  #createLocal(content, visibility) {
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

  #searchLocal(query, pageSize) {
    const haystack = this.#readLocal();
    const needles = String(query || "")
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    const filtered = needles.length
      ? haystack.filter((memo) => needles.every((term) => memo.content.toLowerCase().includes(term)))
      : haystack;
    return filtered.slice(0, pageSize).map((memo) => ({ ...memo, id: memoIdFromName(memo.name) }));
  }
}
