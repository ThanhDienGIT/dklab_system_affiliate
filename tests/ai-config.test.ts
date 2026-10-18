import { describe, expect, it } from "vitest";
import { AiConfigService, fetchGeminiModels, maskKey, type Fetcher } from "@/server/services/ai-config.service";
import type { AiConfigRepository } from "@/server/repositories/ai.repo";
import type { AiConfigRow } from "@/server/domain/ai";

const KEY = "AIzaSyTESTKEY1234567890abcdefgh";
const MODELS = {
  models: [
    { name: "models/gemini-3.5-flash", displayName: "Gemini 3.5 Flash", supportedGenerationMethods: ["generateContent"], inputTokenLimit: 1000000 },
    { name: "models/gemini-2.5-flash-lite", displayName: "Flash Lite", supportedGenerationMethods: ["generateContent", "countTokens"] },
    { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
    { name: "models/gemini-embedding-001", supportedGenerationMethods: ["embedContent"] },
  ],
};
const okFetch: Fetcher = (async (url: string, init?: RequestInit) => {
  const key = (init?.headers as Record<string, string>)["x-goog-api-key"];
  if (key !== KEY) return new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 400 });
  return new Response(JSON.stringify(String(url).includes(":generateContent") ? { candidates: [] } : MODELS), { status: 200 });
}) as never;

function fakeRepo(): AiConfigRepository & { row: AiConfigRow } {
  const r = { row: { apiKeyEnc: null, defaultModel: null, features: {} } as AiConfigRow,
    async get() { return structuredClone(r.row); },
    async save(v: Parameters<AiConfigRepository["save"]>[0]) {
      if (v.apiKeyEnc !== undefined) r.row.apiKeyEnc = v.apiKeyEnc;
      r.row.defaultModel = v.defaultModel;
      for (const f of v.features) r.row.features[f.feature] = { model: f.model, enabled: f.enabled };
    } };
  return r;
}
const crypto = { encrypt: (s: string) => `enc:${s}`, decrypt: (s: string) => s.replace(/^enc:/, "") };
const make = (env: { apiKey?: string } = {}, repo = fakeRepo()) =>
  ({ repo, svc: new AiConfigService(repo, () => ({ apiKey: env.apiKey, model: "gemini-2.5-flash" }), crypto, okFetch) });

describe("fetchGeminiModels", () => {
  it("chi giu model gemini ho tro generateContent, bo 'models/'", async () => {
    const m = await fetchGeminiModels(KEY, okFetch);
    expect(m.map((x) => x.id).sort()).toEqual(["gemini-2.5-flash-lite", "gemini-3.5-flash"]);
  });
  it("key sai -> bao loi ro rang", async () => {
    await expect(fetchGeminiModels("bad", okFetch)).rejects.toThrow(/không hợp lệ/);
  });
});

describe("AiConfigService.resolve", () => {
  it("khong co key -> null (search chi dung luat)", async () => {
    expect(await make().svc.resolve("search")).toBeNull();
  });
  it("chi co env -> GEMINI_MODEL", async () => {
    expect(await make({ apiKey: KEY }).svc.resolve("search")).toMatchObject({ model: "gemini-2.5-flash", source: "env" });
  });
  it("model mac dinh trong DB ap dung cho moi chuc nang; override rieng thang mac dinh", async () => {
    const { svc } = make({ apiKey: KEY });
    await svc.save({ defaultModel: "gemini-3.5-flash", features: {}, actorId: null });
    expect(await svc.resolve("search")).toMatchObject({ model: "gemini-3.5-flash", source: "default" });
    await svc.save({ defaultModel: "gemini-3.5-flash", features: { search: { model: "gemini-2.5-flash-lite", enabled: true } }, actorId: null });
    expect(await svc.resolve("search")).toMatchObject({ model: "gemini-2.5-flash-lite", source: "feature" });
    await svc.save({ defaultModel: "gemini-3.5-flash", features: { search: { model: "gemini-2.5-flash-lite", enabled: false } }, actorId: null });
    expect(await svc.resolve("search")).toMatchObject({ model: "gemini-3.5-flash" });
  });
  it("key luu DB duoc ma hoa va uu tien hon env", async () => {
    const { svc, repo } = make({ apiKey: "ENVKEYENVKEYENVKEYENVKEY" });
    await svc.save({ apiKey: KEY, defaultModel: null, features: {}, actorId: null });
    expect(repo.row.apiKeyEnc).toBe(`enc:${KEY}`);
    expect((await svc.resolve("search"))?.apiKey).toBe(KEY);
    await svc.save({ apiKey: null, defaultModel: null, features: {}, actorId: null });
    expect((await svc.resolve("search"))?.apiKey).toBe("ENVKEYENVKEYENVKEYENVKEY");
  });
});

describe("AiConfigService.save/check", () => {
  it("tu choi key sai, khong luu", async () => {
    const { svc, repo } = make();
    await expect(svc.save({ apiKey: "x".repeat(30), defaultModel: null, features: {}, actorId: null })).rejects.toThrow();
    expect(repo.row.apiKeyEnc).toBeNull();
  });
  it("tu choi model khong co trong danh sach live", async () => {
    const { svc } = make({ apiKey: KEY });
    await expect(svc.save({ defaultModel: "gemini-9-ultra", features: {}, actorId: null })).rejects.toThrow(/không có trong danh sách/);
  });
  it("check tra masked key va danh sach model, khong lo key", async () => {
    const c = await make({ apiKey: KEY }).svc.check();
    expect(c.valid).toBe(true);
    expect(c.models.length).toBe(2);
    expect(JSON.stringify(c)).not.toContain(KEY);
    expect(maskKey(KEY)).toMatch(/^AIza•+efgh$/);
  });
  it("key env sai -> valid=false kem thong bao", async () => {
    const c = await make({ apiKey: "WRONGWRONGWRONGWRONGWRONG" }).svc.check();
    expect(c.valid).toBe(false);
    expect(c.error).toBeTruthy();
  });
});

describe("AiConfigService - lỗi cấu hình thường gặp", () => {
  it("'unset' (chưa chọn model) trả về rỗng cho form", async () => {
    const repo = fakeRepo();
    repo.row.features = { search: { model: "unset", enabled: false } };
    const { svc } = make({}, repo);
    expect((await svc.current()).features.search).toEqual({ model: "", enabled: false });
  });
  it("key đã lưu không giải mã được → báo nhập lại", async () => {
    const repo = fakeRepo();
    repo.row.apiKeyEnc = "hong";
    const svc = new AiConfigService(repo, () => ({ model: "gemini-2.5-flash" }), { encrypt: (s) => s, decrypt: () => { throw new Error("bad"); } }, okFetch);
    expect((await svc.check(true)).error).toMatch(/không giải mã được/);
  });
  it("PII_ENCRYPTION_KEY sai → báo rõ thay vì lỗi 500", async () => {
    const svc = new AiConfigService(fakeRepo(), () => ({ model: "gemini-2.5-flash" }), { encrypt: () => { throw new Error("[eleonore] PII_ENCRYPTION_KEY phải là base64 của đúng 32 byte"); }, decrypt: (s) => s }, okFetch);
    await expect(svc.save({ apiKey: KEY, defaultModel: null, features: {}, actorId: null })).rejects.toThrow(/PII_ENCRYPTION_KEY/);
  });
  it("mất mạng → báo không kết nối được", async () => {
    const down = (async () => { throw new Error("fetch failed"); }) as never;
    await expect(fetchGeminiModels(KEY, down)).rejects.toThrow(/Không kết nối được/);
  });
});

describe("normalizeKey / keyProblem", () => {
  it("bỏ khoảng trắng, xuống dòng, dấu nháy, tiền tố", async () => {
    const { normalizeKey } = await import("@/server/services/ai-config.service");
    expect(normalizeKey(' "AIzaSyTESTKEY1234567890abcdefgh"\n')).toBe("AIzaSyTESTKEY1234567890abcdefgh");
    expect(normalizeKey("GEMINI_API_KEY=AIzaSyTESTKEY1234567890abcdefgh")).toBe("AIzaSyTESTKEY1234567890abcdefgh");
  });
  it("lý do cụ thể", async () => {
    const { keyProblem } = await import("@/server/services/ai-config.service");
    expect(keyProblem("AIza123")).toMatch(/quá ngắn/);
    expect(keyProblem("xkeysib-18ed663e2eb1928513d4bd54d65")).toMatch(/Brevo/);
    expect(keyProblem("AIzaSyTESTKEY1234567890abcdefgh")).toBeNull();
    expect(keyProblem("AQ.Ab8RN6KxTESTKEY1234567890abcdef")).toBeNull();
  });
});

describe("Lưu key khi không gọi được Google", () => {
  const down = (async () => { throw new Error("fetch failed"); }) as never;
  const feat = { search: { model: "unset", enabled: false } };
  it("mặc định từ chối; skipCheck=true vẫn lưu (mã hoá)", async () => {
    const repo = fakeRepo();
    const svc = new AiConfigService(repo, () => ({ apiKey: undefined, model: "gemini-2.5-flash" }), crypto, down);
    await expect(svc.save({ apiKey: "AQ.Ab8RN6LxOET9itSf3tigUDWKf2KmNIFbucx", defaultModel: null, features: feat, actorId: null })).rejects.toThrow(/Không kết nối được/);
    expect(repo.row.apiKeyEnc).toBeNull();
    await svc.save({ apiKey: "AQ.Ab8RN6LxOET9itSf3tigUDWKf2KmNIFbucx", defaultModel: null, features: feat, actorId: null, skipCheck: true });
    expect(repo.row.apiKeyEnc).toBe("enc:AQ.Ab8RN6LxOET9itSf3tigUDWKf2KmNIFbucx");
  });
  it("401 ACCESS_TOKEN_TYPE_UNSUPPORTED → gợi ý copy lại đủ key / tạo key mới", async () => {
    const f = (async () => new Response(JSON.stringify({ error: { message: "ACCESS_TOKEN_TYPE_UNSUPPORTED" } }), { status: 401 })) as never;
    await expect(fetchGeminiModels("AQ.Ab8RN6LxOET9itSf3tigUDWKf2KmNIFbucx", f)).rejects.toThrow(/copy lại TOÀN BỘ key/);
    await expect(fetchGeminiModels("AIzaSyTESTKEY1234567890abcdefgh", f)).rejects.toThrow(/ngừng hỗ trợ/);
  });
});

