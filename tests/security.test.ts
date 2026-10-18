import { beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://x@localhost/x";
  process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.PII_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("PII (CCCD)", () => {
  it("ma hoa roi giai ma dung, moi lan ma hoa cho ket qua khac nhau, khong lo so goc", async () => {
    const { encryptPii, decryptPii, maskCccd } = await import("../src/server/security/pii");
    const a = encryptPii("092201001234"), b = encryptPii("092201001234");
    expect(a).not.toBe(b);
    expect(a).not.toContain("092201001234");
    expect(decryptPii(a)).toBe("092201001234");
    expect(maskCccd("1234")).toBe("••••••••1234");
  });
  it("phat hien du lieu bi sua (GCM auth tag)", async () => {
    const { encryptPii, decryptPii } = await import("../src/server/security/pii");
    const t = encryptPii("092201001234");
    const parts = t.split(".");
    parts[2] = (parts[2] ?? "").replace(/^./, (c) => (c === "A" ? "B" : "A"));
    expect(() => decryptPii(parts.join("."))).toThrow();
  });
});

describe("Validators", () => {
  it("so dien thoai VN", async () => {
    const { normalizePhone } = await import("../src/server/domain/validators");
    expect(normalizePhone("0912 345 678")).toBe("0912345678");
    expect(normalizePhone("+84912345678")).toBe("0912345678");
    expect(normalizePhone("0212345678")).toBeNull();
    expect(normalizePhone("123")).toBeNull();
  });
  it("CCCD 12 so voi ma tinh hop le", async () => {
    const { isValidCccd } = await import("../src/server/domain/validators");
    expect(isValidCccd("092201001234")).toBe(true);
    expect(isValidCccd("000201001234")).toBe(false);
    expect(isValidCccd("09220100123")).toBe(false);
    expect(isValidCccd("09220100123a")).toBe(false);
  });
  it("ho so: thieu truong = null, CCCD sai bi tu choi", async () => {
    const { profileSchema } = await import("../src/server/domain/validators");
    const ok = profileSchema.safeParse({ fullName: "An Nguyen" });
    expect(ok.success && ok.data.phone === null && ok.data.styleIds.length === 0).toBe(true);
    expect(profileSchema.safeParse({ fullName: "An", cccd: "123" }).success).toBe(false);
  });
});

describe("JWT + RBAC", () => {
  it("ky/kiem tra access token, tu choi token sai", async () => {
    const { signAccessToken, verifyAccessToken } = await import("../src/server/security/jwt");
    const t = await signAccessToken({ sub: "u1", role: "editor", tv: 3 });
    const ok = await verifyAccessToken(t);
    expect(ok.ok && ok.claims.role === "editor" && ok.claims.tv === 3).toBe(true);
    expect((await verifyAccessToken(t.slice(0, -2) + "xx")).ok).toBe(false);
    expect((await verifyAccessToken(undefined)).ok).toBe(false);
  });
  it("phan quyen theo vai tro", async () => {
    const { can } = await import("../src/server/security/rbac");
    expect(can("customer", "product.write")).toBe(false);
    expect(can("editor", "product.write")).toBe(true);
    expect(can("editor", "pii.reveal")).toBe(false);
    expect(can("admin", "pii.reveal")).toBe(true);
    expect(can(undefined, "profile.self")).toBe(false);
  });
  it("mat khau scrypt", async () => {
    const { hashPassword, verifyPassword } = await import("../src/server/security/password");
    const h = await hashPassword("Mat-khau-1");
    expect(await verifyPassword("Mat-khau-1", h)).toBe(true);
    expect(await verifyPassword("sai", h)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });
});
