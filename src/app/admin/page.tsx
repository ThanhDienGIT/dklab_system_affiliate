import Link from "next/link";
import { getContainer } from "@/server/container";
import { can } from "@/server/security/rbac";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const c = getContainer();
  const user = await currentUser();
  const canAudit = Boolean(user && can(user.role, "user.manage"));
  const [d, empty] = await Promise.all([c.products.dashboard(), c.misc.topEmptySearches(8)]);
  const audit: Awaited<ReturnType<typeof c.misc.recentAudit>> = canAudit ? await c.misc.recentAudit(8) : [];
  const max = Math.max(1, ...d.clickSeries.map((x) => x.count));
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Đang bán" value={d.products.published} />
        <Stat label="Nháp" value={d.products.draft} />
        <Stat label="Lưu trữ" value={d.products.archived} />
        <Stat label="Click 7 ngày" value={d.clicks7d} accent />
        <Stat label="Người dùng" value={d.users} />
      </div>

      <section className="border border-line bg-paper p-5">
        <div className="mb-4 flex items-baseline justify-between"><h2 className="font-sans text-sm font-semibold uppercase tracking-[0.16em]">Click affiliate 30 ngày</h2><span className="text-xs text-muted">{d.clicks30d} lượt</span></div>
        <div className="flex h-36 items-end gap-[3px]" role="img" aria-label="Biểu đồ click theo ngày">
          {d.clickSeries.map((x) => (
            <div key={x.day} title={`${x.day}: ${x.count}`} className="min-h-px flex-1 bg-gold transition hover:bg-ink" style={{ height: `${Math.max(2, (x.count / max) * 100)}%` }} />
          ))}
          {d.clickSeries.length === 0 && <p className="m-auto text-sm text-muted">Chưa có click nào.</p>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.16em]">Sản phẩm nhiều click</h2>
          <ol className="divide-y divide-line text-sm">
            {d.topProducts.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5"><span className="w-5 text-muted">{i + 1}</span>
                <Link href={`/admin/san-pham/${p.id}`} className="min-w-0 flex-1 truncate hover:text-gold-deep">{p.name}</Link><span className="font-semibold">{p.clicks}</span></li>
            ))}
            {d.topProducts.length === 0 && <li className="py-3 text-muted">Chưa có dữ liệu.</li>}
          </ol>
        </section>
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.16em]">Từ khoá tìm không ra</h2>
          <ul className="divide-y divide-line text-sm">
            {empty.map((e) => <li key={e.query} className="flex justify-between py-2.5"><span className="truncate">{e.query}</span><span className="text-muted">{e.n}×</span></li>)}
            {empty.length === 0 && <li className="py-3 text-muted">Chưa có.</li>}
          </ul>
          <p className="mt-3 text-xs text-muted">Gợi ý nhập thêm sản phẩm hoặc bí danh (alias) cho thể loại/loại.</p>
        </section>
      </div>

      {audit.length > 0 && (
        <section className="border border-line bg-paper p-5">
          <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-[0.16em]">Nhật ký gần đây</h2>
          <ul className="divide-y divide-line text-sm">
            {audit.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><code className="bg-sand px-1.5 py-0.5 text-xs">{a.action}</code> {a.actorEmail ?? "hệ thống"}</span><time className="text-xs text-muted">{a.createdAt}</time></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border p-4 ${accent ? "border-gold bg-gold/10" : "border-line bg-paper"}`}>
      <p className="font-display text-4xl leading-none">{value.toLocaleString("vi-VN")}</p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
    </div>
  );
}
