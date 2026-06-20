import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { MemoRecord, MemosClientOptions, ShortcutRecord, StorageMode } from "./types.js";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function escapeCelStringLiteral(value: string): string {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function loadDotEnv(file: string): Record<string, string> {
  if (!fs.existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const rawLine of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!match) continue;
    const key = match[1];
    const rawValue = match[2];
    if (!key || rawValue === undefined) continue;
    let value = rawValue.trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function findDotEnv(explicitFile?: string): { file: string; values: Record<string, string> } {
  if (explicitFile) {
    const file = path.resolve(explicitFile);
    return { file, values: loadDotEnv(file) };
  }

  for (const file of [path.resolve(".env"), path.join(PROJECT_ROOT, ".env")]) {
    const values = loadDotEnv(file);
    if (Object.keys(values).length > 0) return { file, values };
  }

  return { file: path.resolve(".env"), values: {} };
}

function resolveConfiguredPath(value: string | undefined, baseDir: string): string {
  if (!value) return path.resolve("./.data/local-memos.json");
  return path.isAbsolute(value) ? value : path.resolve(baseDir, value);
}

export class MemosClient {
  readonly baseUrl: string;
  readonly token: string;
  readonly localFile: string;
  readonly forceLocal: boolean;

  constructor(options: MemosClientOptions = {}) {
    const { file: dotEnvFile, values: dotEnv } = findDotEnv(options.envFile);
    const dotEnvDir = path.dirname(dotEnvFile);
    this.baseUrl = normalizeBaseUrl(options.baseUrl || process.env.MEMOS_BASE_URL || dotEnv.MEMOS_BASE_URL);
    this.token = options.token || process.env.MEMOS_PAT || dotEnv.MEMOS_PAT || "";
    this.localFile = options.localFile
      ? path.resolve(options.localFile)
      : process.env.MEMOS_EVOLVE_LOCAL_FILE
        ? path.resolve(process.env.MEMOS_EVOLVE_LOCAL_FILE)
        : resolveConfiguredPath(dotEnv.MEMOS_EVOLVE_LOCAL_FILE, dotEnvDir);
    this.forceLocal = Boolean(options.forceLocal || process.env.MEMOS_EVOLVE_FORCE_LOCAL === "1" || dotEnv.MEMOS_EVOLVE_FORCE_LOCAL === "1");

    if (!this.token && !this.forceLocal) {
      throw new Error("MEMOS_PAT is required for codex-memos-evolve. Set MEMOS_EVOLVE_FORCE_LOCAL=1 only for explicit local development or tests.");
    }
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
    return this.listMemos({
      pageSize,
      filter: query ? `content.contains("${escapeCelStringLiteral(query)}")` : ""
    });
  }

  async listMemos({
    filter = "",
    orderBy = "",
    pageSize = 50
  }: {
    filter?: string;
    orderBy?: string;
    pageSize?: number;
  } = {}): Promise<MemoRecord[]> {
    if (this.mode === "local-json") return this.#readLocal().slice(0, pageSize);
    const url = new URL(`${this.baseUrl}/api/v1/memos`);
    url.searchParams.set("pageSize", String(pageSize));
    if (filter) url.searchParams.set("filter", filter);
    if (orderBy) url.searchParams.set("orderBy", orderBy);
    const res = await fetch(url, { headers: this.#headers(false) });
    if (!res.ok) throw new Error(`Memos list/search failed ${res.status}: ${await res.text()}`);
    const body = await res.json() as { memos?: MemoRecord[]; items?: MemoRecord[] } | MemoRecord[];
    return Array.isArray(body) ? body : body.memos || body.items || [];
  }

  async listPluginMemos(pageSize = 200): Promise<MemoRecord[]> {
    return this.searchMemos("#codex-memos-evolve", pageSize);
  }

  async updateMemo(memo: MemoRecord, content: string): Promise<MemoRecord> {
    if (this.mode === "local-json") return this.#updateLocal(memo, content);
    const name = memo.name || (memo.id ? `memos/${memo.id}` : "");
    if (!name) throw new Error("Cannot update memo without a name or id.");
    const url = new URL(`${this.baseUrl}/api/v1/${name}`);
    url.searchParams.set("updateMask", "content");
    const res = await fetch(url, {
      method: "PATCH",
      headers: this.#headers(),
      body: JSON.stringify({ content })
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Memos update failed ${res.status}: ${message}`);
    }
    return res.json() as Promise<MemoRecord>;
  }

  async listShortcuts(username: string): Promise<ShortcutRecord[]> {
    if (this.mode === "local-json") return this.#readLocalShortcuts();
    const url = new URL(`${this.baseUrl}/api/v1/users/${encodeURIComponent(username)}/shortcuts`);
    const res = await fetch(url, { headers: this.#headers(false) });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Memos list shortcuts failed ${res.status}: ${message}`);
    }
    const body = await res.json() as { shortcuts?: ShortcutRecord[] };
    return body.shortcuts || [];
  }

  async createShortcut(username: string, shortcut: ShortcutRecord): Promise<ShortcutRecord> {
    if (this.mode === "local-json") return this.#createLocalShortcut(shortcut);
    const res = await fetch(`${this.baseUrl}/api/v1/users/${encodeURIComponent(username)}/shortcuts`, {
      method: "POST",
      headers: this.#headers(),
      body: JSON.stringify({ shortcut })
    });
    if (!res.ok) {
      const message = await res.text();
      throw new Error(`Memos create shortcut failed ${res.status}: ${message}`);
    }
    return res.json() as Promise<ShortcutRecord>;
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

  #shortcutFile(): string {
    return this.localFile.replace(/\.json$/, ".shortcuts.json");
  }

  #readLocalShortcuts(): ShortcutRecord[] {
    const file = this.#shortcutFile();
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8")) as ShortcutRecord[];
  }

  #writeLocalShortcuts(items: ShortcutRecord[]): void {
    const file = this.#shortcutFile();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(items, null, 2)}\n`);
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

  #updateLocal(memo: MemoRecord, content: string): MemoRecord {
    const id = memoIdFromName(memo.name) || String(memo.id || "");
    if (!id) throw new Error("Cannot update local memo without a name or id.");
    const items = this.#readLocal();
    const index = items.findIndex((item) => memoIdFromName(item.name) === id || String(item.id || "") === id);
    if (index < 0) throw new Error(`Cannot update missing local memo ${id}.`);
    const updated = {
      ...items[index],
      content,
      updateTime: nowIso()
    };
    items[index] = updated;
    this.#writeLocal(items);
    return { ...updated, id };
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

  #createLocalShortcut(shortcut: ShortcutRecord): ShortcutRecord {
    const items = this.#readLocalShortcuts();
    const existing = items.find((item) => item.title === shortcut.title);
    if (existing) return existing;
    const created = {
      name: `users/local/shortcuts/${memoIdFromName(`memos/${items.length + 1}`)}`,
      title: shortcut.title,
      filter: shortcut.filter
    };
    items.push(created);
    this.#writeLocalShortcuts(items);
    return created;
  }
}
