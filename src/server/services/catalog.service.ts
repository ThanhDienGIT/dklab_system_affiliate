import type { Facets, Paged, ProductCard, ProductDetail, ProductFilter, ReviewBundle, StyleDTO, Taxonomy } from "../domain/types";
import type { ProductRepository } from "../repositories/product.repo";
import type { TaxonomyRepository } from "../repositories/taxonomy.repo";
import type { SettingsRepository, FavoriteRepository } from "../repositories/user.repo";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "../domain/settings";

export type CacheWrap = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string[]) => (...a: A) => Promise<R>;
const noCache: CacheWrap = (fn) => fn;

export interface MenuStyle { slug: string; name: string; image: string | null; images: string[]; children: { slug: string; name: string; href: string }[]; href: string }
export interface HomeData {
  newArrivals: ProductCard[]; bestSellers: ProductCard[]; onSale: ProductCard[];
  styles: (StyleDTO & { count: number })[];
}
export interface StyleLanding {
  style: StyleDTO; total: number;
  sections: { category: { slug: string; name: string }; total: number; items: ProductCard[] }[];
  newest: ProductCard[];
}

/** Tang doc (read model): dung cache khi chay trong Next, khong cache khi test. */
export class CatalogService {
  readonly taxonomy: () => Promise<Taxonomy>;
  readonly settings: () => Promise<SiteSettings>;
  readonly home: () => Promise<HomeData>;
  readonly stylePage: (slug: string) => Promise<StyleLanding | null>;
  readonly detail: (slug: string) => Promise<ProductDetail | null>;
  /** Danh sach / bo loc / lien quan / danh gia: cache 5 phut theo tham so, admin sua -> xoa theo tag "catalog" */
  readonly list: (f: ProductFilter) => Promise<Paged<ProductCard>>;
  readonly facets: (f: ProductFilter) => Promise<Facets>;
  readonly reviews: (productId: number) => Promise<ReviewBundle>;
  private readonly relatedBy: (id: number, styleId: number, typeId: number | null, categoryId: number, limit: number) => Promise<ProductCard[]>;

  constructor(
    private products: ProductRepository,
    private taxo: TaxonomyRepository,
    private settingsRepo: SettingsRepository,
    private favorites: FavoriteRepository,
    cache: CacheWrap = noCache,
  ) {
    this.taxonomy = cache(() => this.taxo.getAll(false), ["taxonomy"]);
    this.settings = cache(async () => mergeSettings(await this.settingsRepo.getAll()), ["settings"]);
    this.home = cache(() => this.buildHome(), ["home"]);
    this.stylePage = cache((slug: string) => this.buildStylePage(slug), ["style-page"]);
    this.detail = cache((slug: string) => this.products.findBySlug(slug), ["product-detail"]);
    this.list = cache((f: ProductFilter) => this.products.list(f), ["list"]);
    this.facets = cache((f: ProductFilter) => this.products.facets(f), ["facets"]);
    this.reviews = cache((productId: number) => this.products.reviewBundle(productId, 100), ["reviews"]);
    this.relatedBy = cache((id: number, styleId: number, typeId: number | null, categoryId: number, limit: number) =>
      this.buildRelated(id, styleId, typeId, categoryId, limit), ["related"]);
  }

  async menu(): Promise<MenuStyle[]> {
    const t = await this.taxonomy();
    // Moi phong cach co CUNG bo submenu = danh sach the loai (dung chung)
    return t.styles.map((s) => ({
      slug: s.slug, name: s.name, image: s.moodImages[0] ?? s.heroImage,
      images: s.moodImages.length ? s.moodImages : s.heroImage ? [s.heroImage] : [], href: `/phong-cach/${s.slug}`,
      children: t.categories.map((c) => ({ slug: c.slug, name: c.name, href: `/phong-cach/${s.slug}/${c.slug}` })),
    }));
  }

  private async buildHome(): Promise<HomeData> {
    const t = await this.taxonomy();
    const [newArrivals, bestSellers, onSale, counts] = await Promise.all([
      this.products.list({ sort: "newest", pageSize: 10 }),
      this.products.list({ sort: "bestseller", pageSize: 10 }),
      this.products.list({ onSale: true, sort: "discount", pageSize: 5 }),
      Promise.all(t.styles.map((s) => this.products.list({ styleSlug: s.slug, pageSize: 1 }).then((r) => r.total))),
    ]);
    return {
      newArrivals: newArrivals.items, bestSellers: bestSellers.items, onSale: onSale.items,
      styles: t.styles.map((s, i) => ({ ...s, count: counts[i] ?? 0 })),
    };
  }

  private async buildStylePage(slug: string): Promise<StyleLanding | null> {
    const t = await this.taxonomy();
    const style = t.styles.find((s) => s.slug === slug);
    if (!style) return null;
    const [sections, newest, total] = await Promise.all([
      Promise.all(t.categories.map(async (c) => {
        const r = await this.products.list({ styleSlug: slug, categorySlug: c.slug, sort: "popular", pageSize: 4 });
        return { category: { slug: c.slug, name: c.name }, total: r.total, items: r.items };
      })),
      this.products.list({ styleSlug: slug, sort: "newest", pageSize: 8 }),
      this.products.list({ styleSlug: slug, pageSize: 1 }),
    ]);
    return { style, total: total.total, sections: sections.filter((s) => s.total > 0), newest: newest.items };
  }


  /**
   * San pham lien quan = CUNG LOAI (cung loai cu the, bat ke phong cach) de khach co nhieu lua chon.
   * Uu tien cung phong cach truoc; san pham khong co loai cu the -> cung the loai.
   */
  related(p: ProductDetail, limit = 12): Promise<ProductCard[]> {
    return this.relatedBy(p.id, p.style.id, p.type?.id ?? null, p.category.id, limit);
  }
  private async buildRelated(id: number, styleId: number, typeId: number | null, categoryId: number, limit: number): Promise<ProductCard[]> {
    const scope = typeId ? { typeId } : { categoryId };
    const same = await this.products.list({ ...scope, styleId, excludeIds: [id], sort: "bestseller", pageSize: limit });
    if (same.items.length >= limit) return same.items;
    const more = await this.products.list({
      ...scope, excludeIds: [id, ...same.items.map((x) => x.id)], sort: "bestseller", pageSize: limit - same.items.length,
    });
    return [...same.items, ...more.items];
  }


  async favoriteCards(userId: string): Promise<ProductCard[]> {
    return this.products.byIds(await this.favorites.ids(userId));
  }
}

export { DEFAULT_SETTINGS };
