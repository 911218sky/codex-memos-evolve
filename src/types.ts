export type StorageMode = "memos-api" | "local-json";

export interface MemoRecord {
  name?: string;
  id?: string | number;
  uid?: number;
  content?: string;
  snippet?: string;
  visibility?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

export interface MemosClientOptions {
  baseUrl?: string;
  token?: string;
  localFile?: string;
  forceLocal?: boolean;
  envFile?: string;
}

export interface TraceInput {
  project?: string;
  task: string;
  outcome?: string;
  observations?: string[];
  corrections?: string[];
  value?: number;
  tags?: string[];
}

export interface PolicyMemoInput {
  project: string;
  slugName: string;
  title: string;
  support: number;
  lesson: string;
  evidence: string[];
  version: number;
}

export interface SkillMemoInput {
  project: string;
  slugName: string;
  title: string;
  support: number;
  workflow: string[];
  version: number;
}

export interface FeedbackInput {
  project?: string;
  target: string;
  rating: number;
  comment?: string;
}

export interface RecallInput {
  task: string;
  project?: string;
  maxTokens?: number;
}

export interface ReflectInput {
  project?: string;
  minSupport?: number;
}

export interface StatsInput {
  project?: string;
}

export interface MemoryCounts {
  trace: number;
  policy: number;
  skill: number;
  feedback: number;
  environment: number;
}

export interface PromotionResult {
  topic: string;
  support: number;
  version: number;
  policy: string | number | undefined;
  skill: string | number | undefined;
}
