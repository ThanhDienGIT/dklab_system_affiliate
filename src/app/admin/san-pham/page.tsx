import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { tokenize } from "@/lib/text";
import { formatVnd } from "@/lib/format";
import { SmartImage } from "@/components/ui/smart-image";
import { Pagination } from "@/components/catalog/pagination";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { BulkProvider, HeadCheck, RowCheck } from "@/components/admin/product-bulk";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sản phẩm" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

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
      styleSlug: pc || undefined, categorySlug: tl || undefined, keywords: q ? tokenize(q) : undefined, sort: "newest", page, pageSize: 20,
    }),
  ]);
  const href = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q); if (status) p.set("status", status); if (pc) p.set("pc", pc); if (tl) p.set("tl", tl); if (n > 1) p.set("trang", String(n));
    return `/admin/san-pham${p.size ? `?${p}` : ""}`;
  };
  const badge: Record<string, string> = { published: "bg-ok/10 text-ok", draft: "bg-gold/15 text-gold-deep", archived: "bg-sand text-muted" };
  const label: Record<string, string> = { published: "Đang bán", draft: "Nháp", archived: "Lưu trữ" };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl">Sản phẩm <span className="text-xl text-muted">({r.total})</span></h1>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/admin/export?format=json${status ? `&status=${status}` : ""}`} className="btn btn-ghost">Xuất JSON</a>
          <a href={`/api/admin/export?format=csv${status ? `&status=${status}` : ""}`} className="btn btn-ghost">Xuất CSV</a>
          <a href={`/api/admin/export?format=xlsx${status ? `&status=${status}` : ""}`} className="btn btn-ghost">Xuất Excel</a>
          <Link href="/admin/nhap-du-lieu" className="btn btn-ghost">Nhập</Link>
          <Link href="/admin/san-pham/moi" className="btn btn-solid"><Plus size={16} /> Thêm sản phẩm</Link>
        </div>
      </div>
      <form className="mb-6 grid gap-3 md:grid-cols-[1fr_170px_170px_150px_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Tìm tên, loại, màu…" className="field" aria-label="Tìm sản phẩm" />
        <select name="pc" defaultValue={pc} className="field" aria-label="Phong cách"><option value="">Mọi phong cách</option>{t.styles.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
        <select name="tl" defaultValue={tl} className="field" aria-label="Thể loại"><option value="">Mọi thể loại</option>{t.categories.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}</select>
        <select name="status" defaultValue={status} className="field" aria-label="Trạng thái"><option value="">Mọi trạng thái</option><option value="published">Đang bán</option><option value="draft">Nháp</option><option value="archived">Lưu trữ</option></select>
        <button className="btn btn-ghost">Lọc</button>
      </form>

      <BulkProvider pageIds={r.items.map((p) => p.id)} total={r.total} filter={{ q: q || undefined, status: status || undefined, pc: pc || undefined, tl: tl || undefined }}>
      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-sand/60 text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr><th className="w-10 p-3"><HeadCheck /></th><th className="p-3">Sản phẩm</th><th className="p-3">Phân loại</th><th className="p-3">Giá</th><th className="p-3">Trạng thái</th><th className="p-3 text-right">Thao tác</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.items.map((p) => (
              <tr key={p.id} className="align-middle">
                <td className="w-10 p-3"><RowCheck id={p.id} name={p.name} /></td>
                <td className="p-3"><div className="flex items-center gap-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-sand"><SmartImage src={p.image} alt="" sizes="44px" /></div>
                  <div className="min-w-0"><p className="line-clamp-2 font-medium">{p.name}</p>{p.isDemo && <span className="text-[10px] uppercase text-muted">Demo</span>}</div></div></td>
                <td className="p-3 text-xs text-ink-soft">{p.style.name} › {p.category.name}{p.type ? <><br />{p.type.name}</> : null}</td>
                <td className="p-3 whitespace-nowrap">{formatVnd(p.price)}</td>
                <td className="p-3"><span className={`px-2 py-1 text-[11px] font-semibold ${badge[p.status ?? "published"]}`}>{label[p.status ?? "published"]}</span></td>
                <td className="p-3"><ProductRowActions id={p.id} slug={p.slug} status={p.status ?? "published"} name={p.name} /></td>
              </tr>
            ))}
            {r.items.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-muted">Không có sản phẩm.</td></tr>}
          </tbody>
        </table>
      </div>
      </BulkProvider>
      <Pagination path="/admin/san-pham" state={parseCatalogParams({})} page={r.page} pageCount={r.pageCount} defaultSort="popular" makeHref={href} />
    </div>
  );
}
