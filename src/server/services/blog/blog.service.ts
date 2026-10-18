import type { ProductCard, ProductDetail } from "../../domain/types";
import type { BlogRepository, PostPatch } from "../../repositories/blog.repo";
import type { AiConfigService } from "../ai-config.service";
import type { BlogSource } from "../../db/schema";
import { AppError } from "../../domain/errors";
import { slugify } from "@/lib/text";
import { fetchHtml, type FetchedPage } from "./safe-fetch";
import { extractPage, type PageFacts } from "./html-extract";
import { pickDistinct, type SearchProvider } from "./search-provider";
import { writeBlog, type BlogDraft } from "./llm";

export type BlogMode = "db" | "web" | "both";
export interface BlogDeps {
  blogs: BlogRepository;
  product: (id: number) => Promise<ProductDetail | null>;
  related: (p: ProductDetail) => Promise<ProductCard[]>;
  byIds: (ids: number[]) => Promise<ProductCard[]>;
  ai: Pick<AiConfigService, "resolve">;
  search: () => SearchProvider | null;
  fetchPage?: (url: string) => Promise<FetchedPage>;
  write?: typeof writeBlog;
}

const money = (n: number) => `${n.toLocaleString("vi-VN")}đ`;

export function dbFactsOf(p: ProductDetail): string {
  const d = p.detail ?? {};
  const lines = [
    `Tên: ${p.name}`, `Giá: ${money(p.price)}${p.originalPrice ? ` (giá gốc ${money(p.originalPrice)})` : ""}`,
    `Phong cách: ${p.style.name}`, `Thể loại: ${p.category.name}${p.type ? ` / ${p.type.name}` : ""}`,
    p.colors.length ? `Màu: ${p.colors.join(", ")}` : "", p.sizes.length ? `Size: ${p.sizes.join(", ")}` : "",
    p.material ? `Chất liệu: ${p.material}` : "", p.tags.length ? `Từ khoá: ${p.tags.join(", ")}` : "",
    p.description ? `Mô tả: ${p.description.slice(0, 1500)}` : "",
    ...(d.attributes ?? []).slice(0, 15).map((a) => `${a.label}: ${a.value}`),
    p.rating ? `Đánh giá: ${p.rating}/5 (${p.reviewCount} lượt)` : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export function webFactsOf(pages: PageFacts[]): string {
  if (!pages.length) return "(không có dữ liệu web)";
  return pages.map((g, i) => [
    `[Nguồn ${i + 1}] ${g.host} — ${g.title}`, g.description && `Mô tả: ${g.description}`,
    g.jsonLd.length ? `Dữ liệu cấu trúc: ${JSON.stringify(g.jsonLd).slice(0, 1200)}` : "", `Nội dung: ${g.text.slice(0, 3500)}`,
  ].filter(Boolean).join("\n")).join("\n\n");
}

/** Loc dau ra cua LLM: chi giu link san pham that, anh trong danh sach cho phep, bo HTML, them muc nguon. */
export function sanitizeDraft(d: BlogDraft, allowedSlugs: Set<string>, allowedImages: Set<string>, sources: BlogSource[]) {
  let md = d.contentMarkdown.replace(/<\/?[a-z][^>]*>/gi, "");
  let imgCount = 0;
  md = md.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_m, alt: string, url: string) =>
    allowedImages.has(url) && imgCount++ < 3 ? `![${alt}](${url})` : "");
  const linked = new Set<string>();
  md = md.replace(/\[([^\]]+)\]\((\/san-pham\/[^)\s]+)\)/g, (m, label: string, href: string) => {
    const slug = href.replace("/san-pham/", "").split(/[?#]/)[0] ?? "";
    if (!allowedSlugs.has(slug)) return label;
    linked.add(slug);
    return m;
  });
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  if (sources.length) md += `\n\n## Nguồn tham khảo\n\n${sources.map((s) => `- [${s.title || s.host}](${s.url}) — ${s.host}`).join("\n")}`;
  const mentioned = new Set([...d.mentionedSlugs.filter((s) => allowedSlugs.has(s)), ...linked]);
  return {
    title: d.title.replace(/\s+/g, " ").trim().slice(0, 120), excerpt: d.excerpt.replace(/\s+/g, " ").trim().slice(0, 220),
    content: md, mentioned,
  };
}

export class BlogService {
  constructor(private d: BlogDeps) {}

  private async uniqueSlug(base: string, exceptId?: number) {
    const root = slugify(base).replace(/-+$/g, "").slice(0, 80) || "bai-viet";
    let slug = root;
    for (let i = 2; await this.d.blogs.slugTaken(slug, exceptId); i++) slug = `${root}-${i}`;
    return slug;
  }

  /** Thu thap du lieu web: tim 3 trang khac nhau + cac URL admin them vao, fetch song song, loi tung trang khong lam hong ca quy trinh. */
  async gather(query: string, extraUrls: string[], excludeHosts: string[]): Promise<{ pages: PageFacts[]; warnings: string[] }> {
    const warnings: string[] = [];
    const urls: { url: string; title: string }[] = extraUrls.map((u) => ({ url: u, title: "" }));
    const provider = this.d.search();
    if (provider) {
      try {
        const hits = pickDistinct(await provider.search(query, 8), 3, excludeHosts);
        for (const h of hits) if (!urls.some((u) => u.url === h.url)) urls.push({ url: h.url, title: h.title });
      } catch (e) { warnings.push(`Tìm kiếm web lỗi: ${e instanceof Error ? e.message : "?"}`); }
    } else if (!extraUrls.length) {
      warnings.push("Chưa cấu hình TAVILY_API_KEY hoặc GOOGLE_CSE_KEY/GOOGLE_CSE_CX nên không tự tìm được trang web");
    }
    const fetchPage = this.d.fetchPage ?? ((u: string) => fetchHtml(u));
    const settled = await Promise.allSettled(urls.slice(0, 5).map(async (u) => extractPage((await fetchPage(u.url)).html, u.url)));
    const pages: PageFacts[] = [];
    settled.forEach((r, i) => {
      if (r.status === "fulfilled" && (r.value.text.length > 200 || r.value.jsonLd.length)) pages.push(r.value);
      else warnings.push(`Bỏ qua ${urls[i]?.url}: ${r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : "lỗi") : "nội dung quá ít"}`);
    });
    return { pages, warnings };
  }

  async generate(opts: { productId: number; mode: BlogMode; extraUrls?: string[]; authorId: string | null }): Promise<{ id: number; slug: string; warnings: string[] }> {
    const product = await this.d.product(opts.productId);
    if (!product) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm");
    const cfg = await this.d.ai.resolve("blog");
    if (!cfg) throw new AppError("VALIDATION", "Chưa có Gemini API key. Vào Cấu hình AI để thiết lập.");

    const wantsWeb = opts.mode !== "db";
    let pages: PageFacts[] = []; let warnings: string[] = [];
    if (wantsWeb) {
      const merchantHost = (() => { try { return new URL(product.productUrl).hostname.replace(/^www\./, ""); } catch { return ""; } })();
      ({ pages, warnings } = await this.gather(`${product.name} ${product.type?.name ?? ""} review chất liệu thông tin`.trim(), opts.extraUrls ?? [], merchantHost ? [merchantHost] : []));
      if (opts.mode === "web" && !pages.length) throw new AppError("VALIDATION", `Không lấy được dữ liệu từ web. ${warnings.join(" ")}`);
    }

    const related = (await this.d.related(product)).filter((r) => r.id !== product.id).slice(0, 12);
    const productList = [product, ...related];
    const allowedSlugs = new Set(productList.map((p) => p.slug));
    const ownImages = (product.images ?? []).filter((u) => /^https?:\/\//.test(u)).slice(0, 5);
    const webImages = pages.flatMap((g) => g.images).slice(0, 12);
    const allowedImages = new Set([...ownImages, ...webImages]);
    const sources: BlogSource[] = pages.map((g) => ({ url: g.url, title: g.title, host: g.host }));

    const draft = await (this.d.write ?? writeBlog)(cfg, {
      dbFacts: opts.mode === "web" ? `Tên: ${product.name}` : dbFactsOf(product),
      webFacts: webFactsOf(pages),
      products: productList.map((p) => `${p.slug} | ${p.name} | ${money(p.price)}`).join("\n"),
      images: [...allowedImages].join("\n") || "(không có)",
    }).catch((e: unknown) => { throw new AppError("INTERNAL", `Gemini không viết được bài: ${e instanceof Error ? e.message.slice(0, 160) : "lỗi"}`); });

    const clean = sanitizeDraft(draft, allowedSlugs, allowedImages, sources);
    const ids = productList.filter((p) => clean.mentioned.has(p.slug) || p.id === product.id).map((p) => p.id);
    const slug = await this.uniqueSlug(clean.title);
    const id = await this.d.blogs.create({
      slug, title: clean.title, excerpt: clean.excerpt, content: clean.content,
      coverUrl: ownImages[0] ?? webImages[0] ?? null, sourceMode: opts.mode, sources,
      imageCandidates: [...new Set([...ownImages, ...webImages])], primaryProductId: product.id,
      aiModel: cfg.model, authorId: opts.authorId, productIds: ids,
    });
    return { id, slug, warnings };
  }

  async update(id: number, patch: PostPatch) {
    const cur = await this.d.blogs.findById(id);
    if (!cur) throw new AppError("NOT_FOUND", "Không tìm thấy bài viết");
    const next: PostPatch = { ...patch };
    if (patch.slug !== undefined) {
      const s = slugify(patch.slug);
      if (!s) throw new AppError("VALIDATION", "Slug không hợp lệ");
      if (await this.d.blogs.slugTaken(s, id)) throw new AppError("CONFLICT", "Slug đã tồn tại");
      next.slug = s;
    }
    if (patch.status === "published" && !(patch.title ?? cur.title).trim()) throw new AppError("VALIDATION", "Thiếu tiêu đề");
    await this.d.blogs.update(id, next);
  }
}
