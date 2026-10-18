import { asc, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { categories, productTypes, styles } from "../db/schema";
import type { CategoryDTO, StyleDTO, Taxonomy, TypeDTO } from "../domain/types";
import type { StyleInput } from "../domain/validators";

export interface TaxonomyRepository {
  getAll(includeInactive?: boolean): Promise<Taxonomy>;
  saveStyle(id: number | null, v: StyleInput): Promise<number>;
  deleteStyle(id: number): Promise<void>;
  saveCategory(id: number | null, v: { name: string; slug: string; aliases: string[]; sortOrder: number; isActive: boolean }): Promise<number>;
  deleteCategory(id: number): Promise<void>;
  saveType(id: number | null, v: { categoryId: number; name: string; slug: string; aliases: string[]; sortOrder: number; isActive: boolean }): Promise<number>;
  deleteType(id: number): Promise<void>;
}

const toStyle = (r: typeof styles.$inferSelect): StyleDTO => ({
  id: r.id, slug: r.slug, name: r.name, tagline: r.tagline, intro: r.intro, palette: r.palette,
  signatureItems: r.signatureItems, keywords: r.keywords, heroImage: r.heroImage, moodImages: r.moodImages,
  sortOrder: r.sortOrder, isActive: r.isActive,
});
const toCat = (r: typeof categories.$inferSelect): CategoryDTO => ({
  id: r.id, slug: r.slug, name: r.name, aliases: r.aliases, sortOrder: r.sortOrder, isActive: r.isActive,
});
const toType = (r: typeof productTypes.$inferSelect): TypeDTO => ({
  id: r.id, categoryId: r.categoryId, slug: r.slug, name: r.name, aliases: r.aliases, sortOrder: r.sortOrder, isActive: r.isActive,
});

export class DrizzleTaxonomyRepository implements TaxonomyRepository {
  constructor(private db: Db) {}

  async getAll(includeInactive = false): Promise<Taxonomy> {
    const [s, c, t] = await Promise.all([
      this.db.select().from(styles).orderBy(asc(styles.sortOrder), asc(styles.id)),
      this.db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      this.db.select().from(productTypes).orderBy(asc(productTypes.sortOrder), asc(productTypes.id)),
    ]);
    const keep = <T extends { isActive: boolean }>(x: T) => includeInactive || x.isActive;
    return { styles: s.filter(keep).map(toStyle), categories: c.filter(keep).map(toCat), types: t.filter(keep).map(toType) };
  }

  async saveStyle(id: number | null, v: StyleInput) {
    if (id) { await this.db.update(styles).set(v).where(eq(styles.id, id)); return id; }
    const [r] = await this.db.insert(styles).values(v).returning({ id: styles.id });
    return r!.id;
  }
  async deleteStyle(id: number) { await this.db.delete(styles).where(eq(styles.id, id)); }

  async saveCategory(id: number | null, v: { name: string; slug: string; aliases: string[]; sortOrder: number; isActive: boolean }) {
    if (id) { await this.db.update(categories).set(v).where(eq(categories.id, id)); return id; }
    const [r] = await this.db.insert(categories).values(v).returning({ id: categories.id });
    return r!.id;
  }
  async deleteCategory(id: number) { await this.db.delete(categories).where(eq(categories.id, id)); }

  async saveType(id: number | null, v: { categoryId: number; name: string; slug: string; aliases: string[]; sortOrder: number; isActive: boolean }) {
    if (id) { await this.db.update(productTypes).set(v).where(eq(productTypes.id, id)); return id; }
    const [r] = await this.db.insert(productTypes).values(v).returning({ id: productTypes.id });
    return r!.id;
  }
  async deleteType(id: number) { await this.db.delete(productTypes).where(eq(productTypes.id, id)); }
}
