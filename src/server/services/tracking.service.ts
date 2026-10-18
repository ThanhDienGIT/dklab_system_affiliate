import type { ProductRepository } from "../repositories/product.repo";
import { sha256 } from "../security/pii";

export class TrackingService {
  constructor(private products: ProductRepository) {}

  /** Tra ve link dich (neu hop le) va ghi click. Chi cho phep http(s). */
  async resolve(slug: string, ctx: { source: string; referer: string | null; userAgent: string; ip: string; userId: string | null }): Promise<string | null> {
    const p = await this.products.findBySlug(slug);
    if (!p) return null;
    const target = [p.affiliateUrl, p.productUrl].find((u) => /^https?:\/\//i.test(u));
    if (!target) return null;
    const device = /mobile|android|iphone|ipad/i.test(ctx.userAgent) ? "mobile" : "desktop";
    const day = new Date().toISOString().slice(0, 10);
    // visitor_hash xoay moi ngay, khong luu IP tho
    const visitorHash = sha256(`${ctx.ip}|${ctx.userAgent}|${day}`).slice(0, 32);
    try {
      await this.products.recordClick({
        productId: p.id, source: ctx.source.slice(0, 30), referer: ctx.referer?.slice(0, 190) ?? null, device, visitorHash, userId: ctx.userId,
      });
    } catch { /* khong de loi ghi log chan nguoi dung di mua */ }
    return target;
  }
}
