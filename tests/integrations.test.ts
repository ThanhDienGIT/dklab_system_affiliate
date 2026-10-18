import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://x@localhost/x";
  process.env.AUTH_SECRET = randomBytes(48).toString("base64url");
  process.env.PII_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});
afterEach(() => vi.unstubAllGlobals());

describe("pgOptions (Supabase TLS)", () => {
  it("bat ssl cho *.supabase.com / *.supabase.co, giu nguyen khi da co sslmode hoac la Postgres thuong", async () => {
    const { pgOptions } = await import("../src/server/db/client");
    expect(pgOptions("postgresql://postgres.abc:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres")).toEqual({ ssl: "require" });
    expect(pgOptions("postgresql://postgres:pw@db.abc.supabase.co:5432/postgres")).toEqual({ ssl: "require" });
    expect(pgOptions("postgresql://u:pw@db.abc.supabase.co/postgres?sslmode=require")).toEqual({});
    expect(pgOptions("postgres://postgres@127.0.0.1:5432/eleonore")).toEqual({});
    expect(pgOptions("khong-phai-url")).toEqual({});
  });
});

describe("Cloudinary", () => {
  it("chu ky khop vi du trong tai lieu Cloudinary", async () => {
    const { cloudinarySignature } = await import("../src/server/storage");
    const sig = cloudinarySignature(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: "1315060510" },
      "abcd",
    );
    expect(sig).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("upload: ky dung tham so, tra ve secure_url, khong gui api_secret", async () => {
    process.env.CLOUDINARY_CLOUD_NAME = "democloud";
    process.env.CLOUDINARY_API_KEY = "key123";
    process.env.CLOUDINARY_API_SECRET = "secret456";
    vi.resetModules();
    let sent: FormData | undefined, url = "";
    vi.stubGlobal("fetch", vi.fn(async (u: string, init: RequestInit) => {
      url = u; sent = init.body as FormData;
      return new Response(JSON.stringify({ secure_url: "https://res.cloudinary.com/democloud/image/upload/v1/system_clothes/products/x.webp" }), { status: 200 });
    }));
    const { cloudinaryDriver, cloudinarySignature } = await import("../src/server/storage");
    const out = await cloudinaryDriver.put(Buffer.from("abc"), "products", "image/webp");
    expect(out).toMatch(/^https:\/\/res\.cloudinary\.com\/democloud\//);
    expect(url).toBe("https://api.cloudinary.com/v1_1/democloud/image/upload");
    expect(sent!.get("api_key")).toBe("key123");
    expect(sent!.get("folder")).toBe("system_clothes/products");
    expect(sent!.has("api_secret")).toBe(false);
    const expected = cloudinarySignature(
      { folder: "system_clothes/products", public_id: String(sent!.get("public_id")), timestamp: String(sent!.get("timestamp")) },
      "secret456",
    );
    expect(sent!.get("signature")).toBe(expected);
  });

  it("loi Cloudinary -> AppError, khong lo chi tiet", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { message: "Invalid cloud_name x" } }), { status: 401 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { cloudinaryDriver } = await import("../src/server/storage");
    await expect(cloudinaryDriver.put(Buffer.from("a"), "avatars", "image/webp")).rejects.toThrow("Tải ảnh lên Cloudinary thất bại");
  });
});
