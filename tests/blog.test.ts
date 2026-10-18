import { describe, expect, it } from "vitest";
import { assertPublicUrl, fetchHtml, isPrivateIp } from "@/server/services/blog/safe-fetch";
import { extractPage } from "@/server/services/blog/html-extract";
import { pickDistinct } from "@/server/services/blog/search-provider";
import { BlogService, sanitizeDraft, type BlogDeps } from "@/server/services/blog/blog.service";
import type { BlogRepository, NewPost } from "@/server/repositories/blog.repo";
import { productInputSchema } from "@/server/domain/validators";
import type { ProductCard, ProductDetail } from "@/server/domain/types";

describe("SSRF guard", () => {
  it.each(["127.0.0.1", "10.1.2.3", "192.168.1.1", "172.16.0.5", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"])("chan %s", (ip) => {
    expect(isPrivateIp(ip)).toBe(true);
  });
  it.each(["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"])("cho phep %s", (ip) => expect(isPrivateIp(ip)).toBe(false));
  it("chan scheme/port/host noi bo/credentials", async () => {
    for (const u of ["file:///etc/passwd", "ftp://a.com", "http://localhost/", "http://127.0.0.1/", "http://a.com:8080/", "http://user:pw@8.8.8.8/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "http://x.internal/"])
      await expect(assertPublicUrl(u)).rejects.toThrow();
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
  it("redirect sang dia chi noi bo bi chan", async () => {
    const f = (async () => new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } })) as never;
    await expect(fetchHtml("https://8.8.8.8/", { fetcher: f })).rejects.toThrow();
  });
  it("chi nhan HTML va cat dung luong", async () => {
    const png = (async () => new Response("x", { status: 200, headers: { "content-type": "image/png" } })) as never;
    await expect(fetchHtml("https://8.8.8.8/", { fetcher: png })).rejects.toThrow(/HTML/);
    const big = (async () => new Response("a".repeat(5000), { status: 200, headers: { "content-type": "text/html" } })) as never;
    const r = await fetchHtml("https://8.8.8.8/", { fetcher: big, maxBytes: 1000 });
    expect(r.html.length).toBeLessThanOrEqual(5000);
  });
});

describe("extractPage", () => {
  const html = `<html><head><title>Áo sơ mi lụa</title><meta property="og:image" content="/a.jpg"><meta property="og:description" content="Mô tả ngắn">
  <script type="application/ld+json">{"@type":"Product","name":"Áo","image":["https://x.com/b.jpg","https://x.com/logo.svg"]}</script></head>
  <body><nav>MENU</nav><article><h1>Áo sơ mi lụa</h1><p>${"Chất liệu lụa mềm mại. ".repeat(30)}</p><img src="/c.jpg" width="600"><img src="/tiny.png" width="20"></article><script>alert(1)</script></body></html>`;
  const g = extractPage(html, "https://www.shop.vn/p/1");
  it("lay title, host, json-ld, anh tuyet doi, bo script/nav", () => {
    expect(g.title).toBe("Áo sơ mi lụa");
    expect(g.host).toBe("shop.vn");
    expect(g.jsonLd[0]?.name).toBe("Áo");
    expect(g.images).toEqual(["https://www.shop.vn/a.jpg", "https://x.com/b.jpg", "https://www.shop.vn/c.jpg"]);
    expect(g.text).not.toMatch(/alert|MENU/);
  });
  it("JSON-LD hong khong lam crash", () => {
    expect(() => extractPage('<script type="application/ld+json">{bad</script><p>x</p>', "https://a.com/")).not.toThrow();
  });
});

describe("pickDistinct", () => {
  it("1 ket qua/host, bo san TMDT", () => {
    const hits = ["https://a.com/1", "https://a.com/2", "https://shopee.vn/x", "https://b.vn/1", "https://c.vn/1", "https://d.vn/1"].map((url) => ({ url, title: "", snippet: "" }));
    expect(pickDistinct(hits, 3).map((h) => h.url)).toEqual(["https://a.com/1", "https://b.vn/1", "https://c.vn/1"]);
  });
});

describe("sanitizeDraft", () => {
  const draft = { title: " T ", excerpt: "e", mentionedSlugs: ["ao-1", "fake"], contentMarkdown: "Xin chào <script>x</script>\n\n[Áo](/san-pham/ao-1) và [Giả](/san-pham/fake)\n\n![ok](https://img/ok.jpg)\n![bad](https://evil/t.gif)" };
  const r = sanitizeDraft(draft, new Set(["ao-1"]), new Set(["https://img/ok.jpg"]), [{ url: "https://a.com/x", title: "A", host: "a.com" }]);
  it("chi giu link sp that + anh cho phep, bo html, them nguon", () => {
    expect(r.content).toContain("[Áo](/san-pham/ao-1)");
    expect(r.content).not.toContain("/san-pham/fake");
    expect(r.content).toContain("Giả");
    expect(r.content).toContain("![ok](https://img/ok.jpg)");
    expect(r.content).not.toContain("evil");
    expect(r.content).not.toMatch(/<script/);
    expect(r.content).toContain("## Nguồn tham khảo");
    expect([...r.mentioned]).toEqual(["ao-1"]);
  });
});

describe("BlogService.generate", () => {
  const prod = { id: 1, slug: "ao-1", name: "Áo 1", price: 100000, originalPrice: null, images: ["https://cdn/p1.jpg"], colors: [], sizes: ["M"], material: "lụa", tags: [], description: "d",
    style: { id: 1, slug: "s", name: "S" }, category: { id: 1, slug: "c", name: "C" }, type: { id: 1, slug: "t", name: "T" }, productUrl: "https://shopee.vn/p", detail: {}, rating: 0, reviewCount: 0 } as unknown as ProductDetail;
  const rel = { id: 2, slug: "ao-2", name: "Áo 2", price: 200000 } as ProductCard;
  const created: NewPost[] = [];
  const repo = { slugTaken: async (s: string) => s === "bai-hay", create: async (p: NewPost) => (created.push(p), 7) } as unknown as BlogRepository;
  const page = (h: string) => `<html><title>${h}</title><body><article>${"Nội dung rất dài về áo lụa. ".repeat(20)}<img src="/i.jpg" width="500"></article></body></html>`;
  const mk = (over: Partial<BlogDeps> = {}) => new BlogService({
    blogs: repo, product: async (id) => (id === 1 ? prod : null), related: async () => [rel], byIds: async () => [],
    ai: { resolve: async () => ({ apiKey: "k", model: "m", source: "env" as const }) },
    search: () => ({ name: "fake", search: async () => ["https://a.vn/1", "https://b.vn/1", "https://c.vn/1"].map((url) => ({ url, title: url, snippet: "" })) }),
    fetchPage: async (url) => ({ url, html: url.includes("c.vn") ? "" : page(url) }),
    write: async () => ({ title: "Bài hay", excerpt: "mô tả", mentionedSlugs: ["ao-2"], contentMarkdown: "## A\n[Áo 2](/san-pham/ao-2)\n![](https://a.vn/i.jpg)" }),
    ...over,
  });
  it("mode both: cao 2 trang hop le, bo trang rong, slug khong trung, gan sp nhac toi", async () => {
    const r = await mk().generate({ productId: 1, mode: "both", authorId: null });
    const p = created.at(-1)!;
    expect(r).toMatchObject({ id: 7, slug: "bai-hay-2" });
    expect(r.warnings.some((w) => w.includes("c.vn"))).toBe(true);
    expect(p.sources.map((s) => s.host)).toEqual(["a.vn", "b.vn"]);
    expect(p.productIds.sort()).toEqual([1, 2]);
    expect(p.primaryProductId).toBe(1);
    expect(p.content).toContain("![](https://a.vn/i.jpg)");
    expect(p.imageCandidates).toContain("https://cdn/p1.jpg");
  });
  it("mode db: khong goi web", async () => {
    let called = 0;
    await mk({ fetchPage: async () => { called++; return { url: "", html: "" }; } }).generate({ productId: 1, mode: "db", authorId: null });
    expect(called).toBe(0);
  });
  it("mode web ma khong lay duoc trang nao -> bao loi, khong tao bai", async () => {
    const n = created.length;
    await expect(mk({ fetchPage: async () => { throw new Error("x"); } }).generate({ productId: 1, mode: "web", authorId: null })).rejects.toThrow(/Không lấy được/);
    expect(created.length).toBe(n);
  });
  it("khong co API key / san pham -> loi ro rang", async () => {
    await expect(mk({ ai: { resolve: async () => null } }).generate({ productId: 1, mode: "db", authorId: null })).rejects.toThrow(/API key/);
    await expect(mk().generate({ productId: 99, mode: "db", authorId: null })).rejects.toThrow(/sản phẩm/);
  });
  it("khong co search provider + khong link -> van bao ro (mode both van viet bang DB)", async () => {
    const r = await mk({ search: () => null }).generate({ productId: 1, mode: "both", authorId: null });
    expect(r.warnings[0]).toMatch(/TAVILY/);
  });
});

describe("gioi han 5 anh", () => {
  const base = { name: "Áo dài", styleId: 1, categoryId: 1, price: 1000 };
  it("6 anh bi tu choi, 5 anh OK", () => {
    expect(productInputSchema.safeParse({ ...base, images: Array(6).fill("https://a/x.jpg") }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...base, images: Array(5).fill("https://a/x.jpg") }).success).toBe(true);
  });
});
