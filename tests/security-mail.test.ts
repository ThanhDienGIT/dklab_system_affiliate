import { beforeAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

let tok: typeof import("@/server/security/email-token");
let rl: typeof import("@/server/security/rate-limit");
let mail: typeof import("@/server/services/mailer");
let VS: typeof import("@/server/services/verification.service").VerificationService;
let http: typeof import("@/server/http");

beforeAll(async () => {
  process.env.DATABASE_URL = "postgres://x@localhost/x";
  process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.PII_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  tok = await import("@/server/security/email-token");
  rl = await import("@/server/security/rate-limit");
  mail = await import("@/server/services/mailer");
  VS = (await import("@/server/services/verification.service")).VerificationService;
  http = await import("@/server/http");
});
afterEach(() => { vi.unstubAllGlobals(); delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; });

describe("token xac thuc email", () => {
  it("ky/kiem tra dung, sai chu ky bi tu choi", async () => {
    const t = await tok.signVerifyToken("u1", "A@B.com");
    expect(await tok.verifyVerifyToken(t)).toEqual({ ok: true, userId: "u1", email: "a@b.com" });
    expect(await tok.verifyVerifyToken(t.slice(0, -3) + "xxx")).toMatchObject({ ok: false, reason: "invalid" });
    expect(await tok.verifyVerifyToken("rac")).toMatchObject({ ok: false });
  });
  it("khong dung duoc access token lam token xac thuc", async () => {
    const { signAccessToken } = await import("@/server/security/jwt");
    expect((await tok.verifyVerifyToken(await signAccessToken({ sub: "u1", role: "admin", tv: 0 }))).ok).toBe(false);
  });
});

describe("VerificationService", () => {
  const sent: { to: string; html: string }[] = [];
  const mailer = { name: "fake", send: async (m: { to: string; html: string }) => { sent.push(m); } };
  const u = { id: "u1", email: "khach@gmail.com", fullName: "Khách <b>", emailVerified: false };
  const store = { ...u };
  const users = { findById: async () => ({ ...store }), update: async (_: string, p: object) => { Object.assign(store, p); } } as never;
  let svc: InstanceType<typeof VS>;
  beforeAll(() => { svc = new VS(users, { audit: async () => {} } as never, () => mailer as never, () => ({ appUrl: "https://shop.vn/", brand: "Éleonore" })); });

  it("gui mail co link tuyet doi, escape HTML, throttle 1 mail/phut", async () => {
    expect((await svc.send(u)).sent).toBe(true);
    expect(sent[0]?.to).toBe("khach@gmail.com");
    expect(sent[0]?.html).toContain("https://shop.vn/xac-thuc-email?token=");
    expect(sent[0]?.html).toContain("Khách &#60;b&#62;");
    expect((await svc.send(u)).reason).toBe("cooldown");
  });
  it("xac thuc: ok -> already; token sai/doi email bi tu choi", async () => {
    const t = new URL(/href="([^"]+)"/.exec(sent[0]!.html)![1]!.replace(/&#38;/g, "&")).searchParams.get("token")!;
    expect(await svc.confirm(t)).toBe("ok");
    expect(store.emailVerified).toBe(true);
    expect(await svc.confirm(t)).toBe("already");
    expect(await svc.confirm("rac")).toBe("invalid");
    store.emailVerified = false; store.email = "khac@gmail.com";
    expect(await svc.confirm(t)).toBe("invalid");
  });
  it("khong cau hinh mailer / da xac thuc / gui loi -> khong nem loi", async () => {
    const none = new VS(users, { audit: async () => {} } as never, () => null, () => ({ appUrl: "x", brand: "b" }));
    expect((await none.send({ ...u, email: "n@x.vn" })).reason).toBe("no_provider");
    expect((await svc.send({ ...u, emailVerified: true })).reason).toBe("already_verified");
    const bad = new VS(users, { audit: async () => {} } as never, () => ({ name: "x", send: async () => { throw new Error("smtp"); } }) as never, () => ({ appUrl: "x", brand: "b" }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await bad.send({ ...u, email: "loi@x.vn" })).reason).toBe("failed");
  });
});

describe("mailer", () => {
  it("Brevo/Resend gui dung payload + header", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => { calls.push({ url, init }); return new Response("{}", { status: 201 }); });
    await mail.brevo("BK", "a@x.vn", "Shop").send({ to: "t@y.vn", subject: "s", html: "h", text: "t" });
    await mail.resend("RK", "a@x.vn", "Shop").send({ to: "t@y.vn", subject: "s", html: "h", text: "t" });
    expect(calls[0]!.url).toBe("https://api.brevo.com/v3/smtp/email");
    expect((calls[0]!.init.headers as Record<string, string>)["api-key"]).toBe("BK");
    expect(JSON.parse(calls[0]!.init.body as string).to).toEqual([{ email: "t@y.vn" }]);
    expect((calls[1]!.init.headers as Record<string, string>).authorization).toBe("Bearer RK");
  });
  it("loi HTTP -> nem loi, khong lo key", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", async () => new Response("denied", { status: 401 }));
    await expect(mail.brevo("SECRETKEY", "a@x.vn", "S").send({ to: "t@y.vn", subject: "s", html: "h", text: "t" })).rejects.toThrow(/Brevo HTTP 401/);
  });
});

describe("gioi han toc do", () => {
  it("bo nho: vuot nguong bi chan", async () => {
    const k = "t:" + Math.random();
    for (let i = 0; i < 3; i++) expect((await rl.limit(k, 3, 60_000)).ok).toBe(true);
    const r = await rl.limit(k, 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterS).toBeGreaterThan(0);
  });
  it("Upstash: dung INCR/PEXPIRE NX, vuot nguong -> chan, retry-after tu PTTL", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://r.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    let n = 0; const seen: string[] = [];
    vi.stubGlobal("fetch", async (_u: string, init: RequestInit) => { seen.push(init.body as string); n++; return new Response(JSON.stringify([{ result: n }, { result: 1 }, { result: 42_000 }])); });
    expect((await rl.limit("up1", 2, 60_000)).ok).toBe(true);
    expect((await rl.limit("up1", 2, 60_000)).ok).toBe(true);
    const r = await rl.limit("up1", 2, 60_000);
    expect(r).toEqual({ ok: false, retryAfterS: 42 });
    expect(seen[0]).toContain('"PEXPIRE"');
  });
  it("Upstash loi -> fail-open sang bo nho, khong nem loi", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://r.upstash.io"; process.env.UPSTASH_REDIS_REST_TOKEN = "tok";
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", async () => { throw new Error("net"); });
    expect((await rl.limit("fo:" + Math.random(), 5, 60_000)).ok).toBe(true);
  });
  it("chan IP", () => {
    rl.ban("9.9.9.9", 60_000);
    expect(rl.isBanned("9.9.9.9")).toBeGreaterThan(0);
    expect(rl.isBanned("8.8.8.8")).toBe(0);
  });
});

describe("readJson", () => {
  const mk = (body: string, headers: Record<string, string> = {}) => new Request("http://x/", { method: "POST", body, headers });
  it("doc JSON binh thuong, chan body qua lon, JSON hong", async () => {
    expect(await http.readJson(mk('{"a":1}'))).toEqual({ a: 1 });
    await expect(http.readJson(mk("x".repeat(100)), 50)).rejects.toThrow(/quá lớn|không hợp lệ/);
    await expect(http.readJson(mk("{", { "content-length": "99999999" }))).rejects.toThrow(/quá lớn/);
    await expect(http.readJson(mk("{bad"))).rejects.toThrow(/không hợp lệ/);
  });
});
