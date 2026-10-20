import Link from "next/link";
import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thống kê" };
const PERIODS = [7, 30, 90] as const;
const nf = (n: number) => n.toLocaleString("vi-VN");

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  await requirePermission("analytics.read", "/admin/thong-ke");
  const raw = Number((await searchParams).d);
  const days = (PERIODS as readonly number[]).includes(raw) ? raw : 30;
  const a = getContainer().analytics;
  const [sum, series, top, searches, empty] = await Promise.all([
    a.summary(days), a.viewSeries(days), a.topViewed(days, 20), a.topSearches(days, 15), a.topSearches(days, 15, true),
  ]);
  const max = Math.max(1, ...series.map((x) => x.views));

  return (
    <div className="space-y-8">
      <PageHeader title="Thống kê" crumbs={[{ label: "Tổng quan" }, { label: "Thống kê" }]} actions={
        <nav aria-label="Khoảng thời gian" className="flex border border-line bg-paper">
          {PERIODS.map((p) => (
            <Link key={p} href={`/admin/thong-ke?d=${p}`} aria-current={p === days ? "page" : undefined}
              className={cn("grid min-h-11 place-items-center px-4 text-sm", p === days ? "bg-ink text-ivory" : "hover:bg-sand")}>{p} ngày</Link>
          ))}
        </nav>
      } />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Lượt xem sản phẩm" value={nf(sum.views)} />
        <Stat label="Click sang sàn" value={nf(sum.clicks)} accent />
        <Stat label="Tỷ lệ click (CTR)" value={`${sum.ctr}%`} />
        <Stat label="Lượt tìm kiếm" value={nf(sum.searches)} />
        <Stat label="Tìm không ra" value={nf(sum.emptySearches)} />
      </div>

      <section className="border border-line bg-paper p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-[0.16em]">Lượt xem & click theo ngày</h2>
          <span className="flex items-center gap-4 text-xs text-muted"><i className="inline-block h-2.5 w-2.5 bg-gold-soft" /> Xem <i className="inline-block h-2.5 w-2.5 bg-ink" /> Click</span>
        </div>
        <div className="flex h-44 items-end gap-[2px]" role="img" aria-label={`Biểu đồ ${days} ngày: ${sum.views} lượt xem, ${sum.clicks} click`}>
          {series.map((x) => (
            <div key={x.day} title={`${x.day}: ${x.views} xem · ${x.clicks} click`} className="relative flex h-full min-w-0 flex-1 items-end">
              <div className="w-full bg-gold-soft" style={{ height: `${Math.max(1, (x.views / max) * 100)}%` }} />
              <div className="absolute inset-x-[20%] bottom-0 bg-ink" style={{ height: `${(x.clicks / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </section>

      <section className="border border-line bg-paper p-5">
        <h2 className="mb-1 font-sans text-sm font-semibold uppercase tracking-[0.16em]">Sản phẩm được xem nhiều nhất</h2>
        <p className="mb-4 text-xs text-muted">CTR thấp + xem nhiều = giá/ảnh/mô tả chưa thuyết phục. CTR cao + xem ít = nên đưa lên trang chủ.</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="py-2 pr-2">#</th><th className="py-2">Sản phẩm</th><th className="py-2 text-right">Xem</th><th className="py-2 text-right">Từ tìm kiếm</th><th className="py-2 text-right">Click</th><th className="py-2 text-right">CTR</th>
            </tr></thead>
            <tbody className="divide-y divide-line">
              {top.map((p, i) => (
                <tr key={p.id}>
                  <td className="py-2 pr-2 text-muted">{i + 1}</td>
                  <td className="py-2"><Link href={`/admin/san-pham/${p.id}`} className="flex items-center gap-3 hover:text-gold-deep">
                    <span className="relative block h-12 w-10 shrink-0 overflow-hidden bg-sand"><SmartImage src={p.image} alt="" sizes="40px" /></span>
                    <span className="line-clamp-2">{p.name}</span></Link></td>
                  <td className="py-2 text-right font-semibold">{nf(p.views)}</td>
                  <td className="py-2 text-right text-muted">{nf(p.fromSearch)}</td>
                  <td className="py-2 text-right">{nf(p.clicks)}</td>
                  <td className={cn("py-2 text-right font-semibold", p.ctr >= 10 ? "text-ok" : p.ctr < 2 ? "text-rose" : "")}>{p.ctr}%</td>
                </tr>
              ))}
              {top.length === 0 && <tr><td colSpan={6} className="py-4 text-muted">Chưa có lượt xem nào trong {days} ngày.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <QueryList title="Từ khoá tìm nhiều" rows={searches} showAvg />
        <QueryList title="Tìm không ra (nên nhập thêm hàng / alias)" rows={empty} />
      </div>
    </div>
  );
}

function QueryList({ title, rows, showAvg }: { title: string; rows: { query: string; n: number; avgResults: number }[]; showAvg?: boolean }) {
  return (
    <section className="border border-line bg-paper p-5">
      <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.16em]">{title}</h2>
      <ul className="divide-y divide-line text-sm">
        {rows.map((r) => (
          <li key={r.query} className="flex items-center justify-between gap-3 py-2.5">
            <Link href={`/tim-kiem?q=${encodeURIComponent(r.query)}`} target="_blank" className="min-w-0 truncate hover:text-gold-deep">{r.query}</Link>
            <span className="shrink-0 text-muted">{r.n}×{showAvg ? ` · ~${r.avgResults} kq` : ""}</span>
          </li>
        ))}
        {rows.length === 0 && <li className="py-3 text-muted">Chưa có dữ liệu.</li>}
      </ul>
    </section>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? "border-gold bg-gold/10" : "border-line bg-paper"}`}>
      <p className="font-display text-3xl leading-tight">{value}</p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
    </div>
  );
}
