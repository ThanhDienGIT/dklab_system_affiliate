import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { can, type Role } from "@/server/security/rbac";
import { maskCccd } from "@/server/security/pii";
import { UserRow } from "@/components/admin/user-row";
import { Pagination } from "@/components/catalog/pagination";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Người dùng" };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function UsersPage({ searchParams }: { searchParams: Promise<RawParams> }) {
  const me = await requirePermission("user.manage", "/admin/nguoi-dung");
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100), role = one(sp.role);
  const page = Math.max(1, Number(one(sp.trang)) || 1);
  const r = await getContainer().users.list({ q: q || undefined, role: (["customer", "editor", "admin"].includes(role) ? role : undefined) as Role | undefined, page, pageSize: 20 });
  const pageCount = Math.max(1, Math.ceil(r.total / 20));
  const href = (n: number) => { const p = new URLSearchParams(); if (q) p.set("q", q); if (role) p.set("role", role); if (n > 1) p.set("trang", String(n)); return `/admin/nguoi-dung${p.size ? `?${p}` : ""}`; };
  return (
    <div>
      <PageHeader title={<>Người dùng <span className="text-xl text-muted">({r.total})</span></>} crumbs={[{ label: "Hệ thống" }, { label: "Người dùng" }]} />
      <form className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_auto]" role="search">
        <input name="q" defaultValue={q} placeholder="Tìm tên, email, số điện thoại…" className="field" aria-label="Tìm người dùng" />
        <select name="role" defaultValue={role} className="field" aria-label="Vai trò"><option value="">Mọi vai trò</option><option value="customer">Khách hàng</option><option value="editor">Biên tập</option><option value="admin">Quản trị</option></select>
        <button className="btn btn-ghost">Lọc</button>
      </form>
      <div className="overflow-x-auto border border-line bg-paper">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-line bg-sand/60 text-[11px] uppercase tracking-[0.14em] text-muted">
            <tr><th className="p-3">Người dùng</th><th className="p-3">Điện thoại</th><th className="p-3">CCCD</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Ngày tạo</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {r.items.map((u) => (
              <UserRow key={u.id} canReveal={can(me.role, "pii.reveal")} u={{
                id: u.id, fullName: u.fullName, email: u.email, phone: u.phone, role: u.role, status: u.status, avatarUrl: u.avatarUrl,
                emailVerified: u.emailVerified, cccdMasked: maskCccd(u.cccdLast4), hasCccd: Boolean(u.cccdEnc), createdAt: u.createdAt.toISOString(), self: u.id === me.id,
              }} />
            ))}
          </tbody>
        </table>
      </div>
      <Pagination path="/admin/nguoi-dung" state={parseCatalogParams({})} page={page} pageCount={pageCount} defaultSort="popular" makeHref={href} />
      <p className="mt-6 text-xs text-muted">CCCD chỉ hiển thị 4 số cuối. Xem đầy đủ cần quyền “pii.reveal”, tự ẩn sau 15 giây và được ghi nhật ký.</p>
    </div>
  );
}
