import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getContainer } from "@/server/container";
import { currentUser } from "@/server/session";
import { PageTitle } from "@/components/ui/page-title";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/catalog/pagination";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";
import { RememberSearch } from "@/components/search/remember-search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tìm kiếm", robots: { index: false } };

const EXAMPLES = ["Quần áo phong cách y2k", "quần áo y2k dưới 500k", "đầm babydoll y2k", "túi xách maximalism", "váy gloomy coquette màu đen"];

export default async function SearchPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const sp = await searchParams;
  const q = ((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim().slice(0, 200);
  const state = parseCatalogParams(sp);
  const user = q ? await currentUser() : null;
  const out = q ? await getContainer().search.search(q, { page: state.page, pageSize: 24, userId: user?.id ?? null, log: state.page === 1 }) : null;
  const r = out?.result;

  return (
    <>
      <RememberSearch q={q} />
      <PageTitle eyebrow="Tìm kiếm thông minh" title={q ? `“${q}”` : "Bạn muốn tìm gì?"} sub="Gõ tự nhiên: phong cách + thể loại + màu + giá, ví dụ “quần áo y2k dưới 500k”." />
      <div className="container-x pt-8">
        <form action="/tim-kiem" role="search" className="mx-auto flex max-w-2xl gap-2">
          <input name="q" defaultValue={q} type="search" placeholder="Quần áo phong cách y2k dưới 500k" aria-label="Từ khoá tìm kiếm" className="field" />
          <button type="submit" className="btn btn-solid">Tìm</button>
        </form>

        {!out && (
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap justify-center gap-2">
            {EXAMPLES.map((e) => <Link key={e} href={`/tim-kiem?q=${encodeURIComponent(e)}`} className="border border-line px-3 py-2 text-sm hover:border-gold-deep hover:text-gold-deep">{e}</Link>)}
          </div>
        )}

        {out && r && (
          <div className="mt-10">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-muted"><Sparkles size={14} className="text-gold" />
                {out.planner === "rules" ? "Đã phân tích" : "Đã phân tích bằng Gemini + LangChain"}:</span>
              {out.labels.length ? out.labels.map((l) => <span key={l} className="bg-sand px-3 py-1 text-xs font-medium">{l}</span>) : <span className="text-xs text-muted">tìm theo từ khoá</span>}
            </div>
            {out.relaxed.length > 0 && (
              <p className="mb-6 border-l-2 border-gold bg-sand px-4 py-3 text-sm" role="status">
                Không có sản phẩm khớp hoàn toàn. Đã nới điều kiện: bỏ {out.relaxed.join(", ")}. Dưới đây là gợi ý gần nhất.
              </p>
            )}
            <p className="mb-6 text-sm text-muted" role="status">{r.total} sản phẩm</p>
            {r.items.length ? <ProductGrid items={r.items} cols={4} /> : (
              <div className="grid place-items-center gap-3 border border-dashed border-line py-16 text-center">
                <p className="font-display text-3xl">Chưa tìm thấy sản phẩm</p>
                <Link href="/san-pham" className="btn btn-ghost">Xem tất cả sản phẩm</Link>
              </div>
            )}
            <Pagination path="/tim-kiem" state={state} page={r.page} pageCount={r.pageCount} defaultSort="popular" makeHref={(n) => `/tim-kiem?q=${encodeURIComponent(q)}${n > 1 ? `&trang=${n}` : ""}`} />
          </div>
        )}
      </div>
    </>
  );
}
