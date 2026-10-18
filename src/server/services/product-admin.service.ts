import type { ProductRepository, ProductWrite } from "../repositories/product.repo";
import type { MiscRepository } from "../repositories/user.repo";
import type { ProductFilter, Taxonomy } from "../domain/types";
import { AppError } from "../domain/errors";
import { productInputSchema, type ProductInput } from "../domain/validators";
import { validation } from "./auth.service";
import { colorName } from "@/lib/constants";
import { normalizeVi, slugify } from "@/lib/text";

export function buildSearchText(p: { name: string; tags: string[]; colors: string[]; material: string; description?: string }, names: string[]): string {
  return normalizeVi([p.name, ...names, ...p.tags, ...p.colors.map(colorName), p.material].join(" "));
}

export class ProductAdminService {
  constructor(
    private products: ProductRepository,
    private misc: MiscRepository,
    private getTaxonomy: () => Promise<Taxonomy>,
  ) {}

  /** Kiem tra phong cach / the loai / loai cu the co khop nhau khong (loai phai thuoc the loai) */
  private async resolve(v: ProductInput, taxo?: Taxonomy) {
    const t = taxo ?? (await this.taxonomy());
    const style = t.styles.find((s) => s.id === v.styleId);
    const cat = t.categories.find((c) => c.id === v.categoryId);
    if (!style) throw new AppError("VALIDATION", "Phong cách không tồn tại", { styleId: "Chọn phong cách" });
    if (!cat) throw new AppError("VALIDATION", "Thể loại không tồn tại", { categoryId: "Chọn thể loại" });
    const type = v.typeId ? t.types.find((x) => x.id === v.typeId) : undefined;
    if (v.typeId && (!type || type.categoryId !== cat.id)) {
      throw new AppError("VALIDATION", "Loại cụ thể không thuộc thể loại đã chọn", { typeId: `Loại này không thuộc "${cat.name}"` });
    }
    return { style, cat, type };
  }
  private taxonomy() { return this.getTaxonomy(); }

  private async uniqueSlug(base: string, exceptId?: number) {
    const root = slugify(base) || "san-pham";
    let slug = root, i = 2;
    while (await this.products.slugExists(slug, exceptId)) slug = `${root}-${i++}`;
    return slug;
  }

  private async toWrite(v: ProductInput, exceptId?: number, taxo?: Taxonomy): Promise<ProductWrite> {
    const { style, cat, type } = await this.resolve(v, taxo);
    if (v.originalPrice !== null && v.originalPrice <= v.price) v = { ...v, originalPrice: null };
    return {
      ...v,
      slug: v.slug && v.slug.length ? v.slug : await this.uniqueSlug(v.name, exceptId),
      searchText: buildSearchText(v, [style.name, cat.name, type?.name ?? ""]),
    };
  }

  async create(raw: unknown, actorId: string): Promise<number> {
    const parsed = productInputSchema.safeParse(raw);
    if (!parsed.success) throw validation(parsed.error.issues);
    const w = await this.toWrite(parsed.data);
    if (parsed.data.slug && (await this.products.slugExists(w.slug))) throw new AppError("CONFLICT", "Slug đã tồn tại", { slug: "Slug đã tồn tại" });
    const id = await this.products.create(w);
    await this.misc.audit({ actorId, action: "product.create", entity: "product", entityId: String(id) });
    return id;
  }

  async update(id: number, raw: unknown, actorId: string): Promise<void> {
    const parsed = productInputSchema.safeParse(raw);
    if (!parsed.success) throw validation(parsed.error.issues);
    if (!(await this.products.findById(id))) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm");
    const w = await this.toWrite(parsed.data, id);
    // Form cu / client khong gui "detail" -> giu nguyen chi tiet da luu thay vi ghi de bang {}
    const sent = raw as Record<string, unknown> | null;
    const patch: Partial<ProductWrite> = { ...w };
    if (!sent || typeof sent !== "object" || !("detail" in sent)) delete patch.detail;
    if (parsed.data.slug && (await this.products.slugExists(w.slug, id))) throw new AppError("CONFLICT", "Slug đã tồn tại", { slug: "Slug đã tồn tại" });
    await this.products.update(id, patch);
    await this.misc.audit({ actorId, action: "product.update", entity: "product", entityId: String(id) });
  }

  async remove(id: number, actorId: string) {
    await this.products.delete(id);
    await this.misc.audit({ actorId, action: "product.delete", entity: "product", entityId: String(id) });
  }

  /** Xoa hang loat. `filter` = xoa moi san pham khop bo loc (khong co bo loc = TOAN BO san pham). */
  async removeMany(sel: { ids: number[] } | { filter: ProductFilter }, actorId: string) {
    const ids = "ids" in sel ? sel.ids : await this.products.idsMatching(sel.filter);
    if (!ids.length) return 0;
    const deleted = await this.products.deleteMany(ids);
    await this.misc.audit({
      actorId, action: "product.bulk_delete", entity: "product",
      meta: { count: deleted, mode: "ids" in sel ? "selected" : "filter", ids: ids.slice(0, 50) },
    });
    return deleted;
  }

  setStatus(id: number, status: "draft" | "published" | "archived") { return this.products.setStatus(id, status); }

  /** Dung cho import: tinh lai searchText + slug tu input da hop le. `taxo`: danh muc moi nhat (khong qua cache) */
  async prepare(v: ProductInput, exceptId?: number, taxo?: Taxonomy) { return this.toWrite(v, exceptId, taxo); }
  findByItemId(merchant: string, itemId: string) { return this.products.findByItemId(merchant, itemId); }
  findBySlug(slug: string) { return this.products.findBySlug(slug, true); }
  upsertWrite(id: number | null, w: ProductWrite) { return id ? this.products.update(id, w).then(() => id) : this.products.create(w); }
}
