import { AI_FEATURE_IDS, MODEL_ID_RE, type AiConfigRow, type AiFeatureId, type GeminiModel } from "../domain/ai";
import type { AiConfigRepository } from "../repositories/ai.repo";
import { AppError } from "../domain/errors";

export interface AiEnv { apiKey?: string; model: string }
export interface Crypto { encrypt(s: string): string; decrypt(s: string): string }
export type Fetcher = typeof fetch;

const API = "https://generativelanguage.googleapis.com/v1beta";
const CACHE_MS = 30_000;

export interface KeyCheck {
  source: "db" | "env" | "none";
  masked: string | null;
  valid: boolean;
  error: string | null;
  models: GeminiModel[];
}

export const maskKey = (k: string) => (k.length <= 8 ? "••••" : `${k.slice(0, 4)}••••••••${k.slice(-4)}`);

/** Goi GET /v1beta/models de vua kiem tra key vua lay danh sach model (chi giu model ho tro generateContent). */
export async function fetchGeminiModels(apiKey: string, fetcher: Fetcher = fetch, timeoutMs = 8000): Promise<GeminiModel[]> {
  const out: GeminiModel[] = [];
  let token = "";
  for (let page = 0; page < 5; page++) {
    const res = await fetcher(`${API}/models?pageSize=200${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`, {
      headers: { "x-goog-api-key": apiKey }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store",
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = (await res.json()) as { error?: { message?: string } }; if (j.error?.message) msg = j.error.message; } catch { /* ignore */ }
      throw new AppError("VALIDATION", res.status === 400 || res.status === 403 || res.status === 401 ? `API key không hợp lệ hoặc bị từ chối: ${msg.slice(0, 160)}` : `Gemini API lỗi: ${msg.slice(0, 160)}`);
    }
    const j = (await res.json()) as { models?: Record<string, unknown>[]; nextPageToken?: string };
    for (const m of j.models ?? []) {
      const methods = (m.supportedGenerationMethods as string[] | undefined) ?? [];
      const name = String(m.name ?? "").replace(/^models\//, "");
      if (!methods.includes("generateContent") || !name.startsWith("gemini")) continue;
      out.push({
        id: name, displayName: String(m.displayName ?? name), description: String(m.description ?? "").slice(0, 240),
        inputTokenLimit: typeof m.inputTokenLimit === "number" ? m.inputTokenLimit : null,
        outputTokenLimit: typeof m.outputTokenLimit === "number" ? m.outputTokenLimit : null,
      });
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}

/** Goi thu 1 cau ngan de chac chan model dung duoc (khong chi nam trong danh sach). */
export async function pingModel(apiKey: string, model: string, fetcher: Fetcher = fetch): Promise<{ ok: boolean; ms: number; error?: string }> {
  const t = Date.now();
  try {
    const res = await fetcher(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST", headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "Trả lời đúng một từ: ok" }] }], generationConfig: { maxOutputTokens: 8, temperature: 0 } }),
      signal: AbortSignal.timeout(12_000), cache: "no-store",
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = (await res.json()) as { error?: { message?: string } }; if (j.error?.message) msg = j.error.message; } catch { /* ignore */ }
      return { ok: false, ms: Date.now() - t, error: msg.slice(0, 200) };
    }
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message.slice(0, 200) : "loi" };
  }
}

export class AiConfigService {
  private cache: { at: number; row: AiConfigRow } | null = null;
  private modelCache: { at: number; keyId: string; models: GeminiModel[] } | null = null;

  constructor(private repo: AiConfigRepository, private getEnv: () => AiEnv, private crypto: Crypto, private fetcher: Fetcher = fetch) {}

  private async row(): Promise<AiConfigRow> {
    if (this.cache && Date.now() - this.cache.at < CACHE_MS) return this.cache.row;
    const row = await this.repo.get();
    this.cache = { at: Date.now(), row };
    return row;
  }
  invalidate() { this.cache = null; this.modelCache = null; }

  private keyOf(row: AiConfigRow): { key: string | null; source: "db" | "env" | "none" } {
    if (row.apiKeyEnc) {
      try { return { key: this.crypto.decrypt(row.apiKeyEnc), source: "db" }; } catch { /* key hong -> roi ve env */ }
    }
    const e = this.getEnv().apiKey;
    return e ? { key: e, source: "env" } : { key: null, source: "none" };
  }

  /** Dung o noi goi AI: feature -> model rieng (neu bat) -> model mac dinh -> GEMINI_MODEL. Tra null neu chua co key. */
  async resolve(feature: AiFeatureId): Promise<{ apiKey: string; model: string; source: "feature" | "default" | "env" } | null> {
    const row = await this.row();
    const { key } = this.keyOf(row);
    if (!key) return null;
    const f = row.features[feature];
    if (f?.enabled && f.model) return { apiKey: key, model: f.model, source: "feature" };
    if (row.defaultModel) return { apiKey: key, model: row.defaultModel, source: "default" };
    return { apiKey: key, model: this.getEnv().model, source: "env" };
  }

  /** Luc vao trang admin: kiem tra key + lay danh sach model truc tiep tu Gemini. */
  async check(force = false): Promise<KeyCheck> {
    const row = await this.row();
    const { key, source } = this.keyOf(row);
    if (!key) return { source, masked: null, valid: false, error: "Chưa có API key (đặt GEMINI_API_KEY hoặc nhập ở form bên dưới)", models: [] };
    const keyId = maskKey(key);
    if (!force && this.modelCache && this.modelCache.keyId === keyId && Date.now() - this.modelCache.at < CACHE_MS) {
      return { source, masked: keyId, valid: true, error: null, models: this.modelCache.models };
    }
    try {
      const models = await fetchGeminiModels(key, this.fetcher);
      this.modelCache = { at: Date.now(), keyId, models };
      return { source, masked: keyId, valid: true, error: null, models };
    } catch (e) {
      return { source, masked: keyId, valid: false, error: e instanceof Error ? e.message : "Không kiểm tra được key", models: [] };
    }
  }

  async current() {
    const row = await this.row();
    return {
      defaultModel: row.defaultModel,
      envModel: this.getEnv().model,
      features: Object.fromEntries(AI_FEATURE_IDS.map((id) => [id, row.features[id] ?? { model: "", enabled: false }])),
    };
  }

  async test(model: string): Promise<{ ok: boolean; ms: number; error?: string }> {
    if (!MODEL_ID_RE.test(model)) throw new AppError("VALIDATION", "Tên model không hợp lệ");
    const { key } = this.keyOf(await this.row());
    if (!key) throw new AppError("VALIDATION", "Chưa có API key");
    return pingModel(key, model, this.fetcher);
  }

  async save(input: {
    apiKey?: string | null; defaultModel: string | null;
    features: Partial<Record<AiFeatureId, { model: string; enabled: boolean }>>; actorId: string | null;
  }): Promise<KeyCheck> {
    let apiKeyEnc: string | null | undefined;
    let candidateKey: string | null = this.keyOf(await this.row()).key;
    if (input.apiKey === null) { apiKeyEnc = null; candidateKey = this.getEnv().apiKey ?? null; }
    else if (typeof input.apiKey === "string" && input.apiKey.trim()) {
      const k = input.apiKey.trim();
      if (!/^[\w-]{20,200}$/.test(k)) throw new AppError("VALIDATION", "API key sai định dạng");
      // Kiem tra key that su dung duoc truoc khi luu
      await fetchGeminiModels(k, this.fetcher);
      apiKeyEnc = this.crypto.encrypt(k); candidateKey = k;
    }
    const chosen = [input.defaultModel, ...Object.values(input.features).filter((f) => f?.enabled).map((f) => f!.model)].filter(Boolean) as string[];
    for (const m of chosen) if (!MODEL_ID_RE.test(m)) throw new AppError("VALIDATION", `Tên model không hợp lệ: ${m}`);
    if (candidateKey && chosen.length) {
      const live = new Set((await fetchGeminiModels(candidateKey, this.fetcher)).map((m) => m.id));
      const bad = chosen.find((m) => !live.has(m));
      if (bad) throw new AppError("VALIDATION", `Model "${bad}" không có trong danh sách Gemini API của key này`);
    }
    await this.repo.save({
      apiKeyEnc, defaultModel: input.defaultModel || null, updatedBy: input.actorId,
      features: AI_FEATURE_IDS.filter((id) => input.features[id]).map((id) => ({ feature: id, model: input.features[id]!.model, enabled: input.features[id]!.enabled })),
    });
    this.invalidate();
    return this.check(true);
  }
}
