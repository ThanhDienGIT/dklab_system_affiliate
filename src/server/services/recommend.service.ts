import type { ProductCard, StyleDTO } from "../domain/types";
import type { ProductRepository } from "../repositories/product.repo";
import type { UserRepository } from "../repositories/user.repo";
import type { Taxonomy } from "../domain/types";

export interface Recommendation { items: ProductCard[]; basedOn: StyleDTO[]; budgetMax: number | null }

/** Goi y theo phong cach yeu thich + ngan sach trong ho so ca nhan. Chua cau hinh -> tra ve ban chay. */
export class RecommendService {
  constructor(private products: ProductRepository, private users: UserRepository, private getTaxonomy: () => Promise<Taxonomy>) {}

  async forUser(userId: string, limit = 8): Promise<Recommendation> {
    const [u, ids, t] = await Promise.all([this.users.findById(userId), this.users.styleIds(userId), this.getTaxonomy()]);
    const basedOn = t.styles.filter((s) => ids.includes(s.id));
    const budgetMax = u?.budgetMax ?? null;
    if (!basedOn.length) {
      const r = await this.products.list({ sort: "bestseller", pageSize: limit, priceMax: budgetMax ? Math.round(budgetMax * 1.2) : undefined });
      return { items: r.items, basedOn: [], budgetMax };
    }
    // moi phong cach 1 phan: tranh 1 phong cach chiem het cac vi tri
    const per = Math.max(2, Math.ceil(limit / basedOn.length));
    const lists = await Promise.all(basedOn.map((s) =>
      this.products.list({ styleId: s.id, sort: "popular", pageSize: per, priceMax: budgetMax ? Math.round(budgetMax * 1.2) : undefined })));
    const seen = new Set<number>();
    const items: ProductCard[] = [];
    for (let i = 0; items.length < limit && i < per; i++) {
      for (const l of lists) {
        const p = l.items[i];
        if (p && !seen.has(p.id)) { seen.add(p.id); items.push(p); }
      }
    }
    if (items.length < limit) {
      const more = await this.products.list({ sort: "bestseller", pageSize: limit * 2, excludeIds: [...seen] });
      items.push(...more.items.slice(0, limit - items.length));
    }
    return { items: items.slice(0, limit), basedOn, budgetMax };
  }
}
