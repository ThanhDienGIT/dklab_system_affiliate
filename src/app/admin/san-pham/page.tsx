import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search, Upload, X } from "lucide-react";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { tokenize } from "@/lib/text";
import { formatVnd } from "@/lib/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Pagination } from "@/components/catalog/pagination";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { BulkProvider, HeadCheck, RowCheck } from "@/components/admin/product-bulk";
import { ExportMenu } from "@/components/admin/export-menu";
import { PageHeader } from "@/components/admin/page-header";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sản phẩm" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const PAGE_SIZE = 20;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<RawParams> }) {
  await requirePermission("product.write", "/admin/san-pham");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100), status = one(sp.status), pc = one(sp.pc), tl = one(sp.tl);
  const page = Math.max(1, Number(one(sp.trang)) || 1);
  const c = getContainer();
  const [t, r] = await Promise.all([
    c.catalog.taxonomy(),
    c.products.list({
      includeAll: true, status: (["draft", "published", "archived"].includes(status) ? status : undefined) as "draft" | undefined,
      styleSlug: pc || undefined, categorySlug: tl || undefined, keywords: q ? tokenize(q) : undefined, sort: "newest", page, pageSize: PAGE_SIZE,
    }),
  ]);
  const href = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q); if (status) p.set("status", status); if (pc) p.set("pc", pc); if (tl) p.set("tl", tl); if (n > 1) p.set("trang", String(n));
    return `/admin/san-pham${p.size ? `?${p}` : ""}`;
  };
  const filtered = Boolean(q || status || pc || tl);
  const badge: Record<string, string> = { published: "bg-ok/10 text-ok", draft: "bg-gold/15 text-gold-deep", archived: "bg-sand text-muted" };
  const label: Record<string, string> = { published: "Đang bán", draft: "Nháp", archived: "Lưu trữ" };
  const from = r.total ? (r.page - 1) * PAGE_SIZE + 1 : 0, to = Math.min(r.total, r.page * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Danh sách sản phẩm" crumbs={[{ label: "Sản phẩm" }]}
        description="Quản lý sản phẩm affiliate: lọc, sửa nhanh, xuất Excel có dropdown phân loại và nhập lại." />

      <section className="border border-line bg-paper" aria-labelledby="products-title">
        {/* Dau card: tieu de + nut chinh */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id="products-title" className="font-sans text-base font-semibold">Sản phẩm</h2>
            <p className="text-sm text-muted">{r.total.toLocaleString("vi-VN")} sản phẩm{filtered ? " khớp bộ lọc" : ""}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportMenu status={status || undefined} />
            <Link href="/admin/nhap-du-lieu" className="btn btn-ghost !px-5"><Upload size={15} /> Nhập</Link>
            <Link href="/admin/san-pham/moi" className="btn btn-solid !px-5"><Plus size={16} /> Thêm sản phẩm</Link>
          </div>
        </div>

        {/* Thanh loc */}
        <form className="grid gap-3 border-b border-line px-5 py-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_180px_180px_160px_auto]" role="search" aria-label="Lọc sản phẩm">
          <div className="relative md:col-span-2 xl:col-span-1">
            <Search size={17} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" defaultValue={q} placeholder="Tìm tên, loại, màu…" className="field !pl-10" aria-label="Tìm sản phẩm" />
          </div>
          <select name="pc" defaultValue={pc} className="field" aria-label="Phong cách"><option value="">Mọi phong cách</option>{t.styles.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
          <select name="tl" defaultValue={tl} className="field" aria-label="Thể loại"><option value="">Mọi thể loại</option>{t.categories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
          <select name="status" defaultValue={status} className="field" aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="published">Đang bán</option><option value="draft">Nháp</option><option value="archived">Lưu trữ</option></select>
          <div className="flex gap-2">
            <button className="btn btn-solid flex-1 !px-6">Lọc</button>
            {filtered && <Link href="/admin/san-pham" className="btn btn-ghost !px-3" aria-label="Xoá bộ lọc" title="Xoá bộ lọc"><X size={16} /></Link>}
          </div>
        </form>

        <BulkProvider pageIds={r.items.map((p) => p.id)} total={r.total} filter={{ q: q || undefined, status: status || undefined, pc: pc || undefined, tl: tl || undefined }}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="whitespace-nowrap border-b border-line bg-sand/50 text-[11px] uppercase tracking-[0.14em] text-muted">
                <tr>
                  <th scope="col" className="w-12 px-5 py-3"><HeadCheck /></th>
                  <th scope="col" className="px-3 py-3 font-semibold">Sản phẩm</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Phân loại</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Giá</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Đã bán</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Trạng thái</th>
                  <th scope="col" className="px-5 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {r.items.map((p) => {
                  const st = p.status ?? "published";
                  return (
                    <tr key={p.id} className="align-middle transition-colors hover:bg-ivory">
                      <td className="w-12 px-5 py-3"><RowCheck id={p.id} name={p.name} /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand"><SmartImage src={p.image} alt="" sizes="44px" /></div>
                          <div className="min-w-0">
                            <Link href={`/admin/san-pham/${p.id}`} className="line-clamp-2 font-medium hover:text-gold-deep">{p.name}</Link>
                            <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-muted">{p.merchant}{p.isDemo ? " · Demo" : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-xs text-ink-soft">
                        <span className="block">{p.category.name}{p.type ? ` › ${p.type.name}` : ""}</span>
                        <span className="text-muted">{p.style.name}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="font-semibold">{formatVnd(p.price)}</span>
                        {p.originalPrice && p.originalPrice > p.price ? <span className="block text-xs text-muted line-through">{formatVnd(p.originalPrice)}</span> : null}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-ink-soft">{p.sold.toLocaleString("vi-VN")}</td>
                      <td className="px-3 py-3"><span className={`inline-block whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold ${badge[st]}`}>{label[st]}</span></td>
                      <td className="px-5 py-3"><ProductRowActions id={p.id} slug={p.slug} status={st} name={p.name} /></td>
                    </tr>
                  );
                })}
                {r.items.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-14 text-center text-muted">
                    Không có sản phẩm{filtered ? " khớp bộ lọc" : ""}.{" "}
                    {filtered ? <Link href="/admin/san-pham" className="underline underline-offset-4 hover:text-ink">Xoá bộ lọc</Link> : <Link href="/admin/san-pham/moi" className="underline underline-offset-4 hover:text-ink">Thêm sản phẩm đầu tiên</Link>}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </BulkProvider>

        {/* Chan card: dem + phan trang */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <p className="text-sm text-muted">Hiển thị <span className="font-semibold text-ink">{from}–{to}</span> trên <span className="font-semibold text-ink">{r.total.toLocaleString("vi-VN")}</span></p>
          <Pagination className="mt-0" path="/admin/san-pham" state={parseCatalogParams({})} page={r.page} pageCount={r.pageCount} defaultSort="popular" makeHref={href} />
        </div>
      </section>
    </div>
  );
}
