"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

export interface UserListItem {
  id: string; fullName: string; email: string; phone: string | null; role: "customer" | "editor" | "admin"; status: "active" | "blocked";
  avatarUrl: string | null; emailVerified: boolean; cccdMasked: string; hasCccd: boolean; createdAt: string; self: boolean;
}

export function UserRow({ u, canReveal }: { u: UserListItem; canReveal: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [role, setRole] = useState(u.role);
  const [status, setStatus] = useState(u.status);
  const [cccd, setCccd] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save(next: { role?: string; status?: string }) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${u.id}`, { method: "PATCH", body: { role: next.role ?? role, status: next.status ?? status } });
      if (next.role) setRole(next.role as typeof role);
      if (next.status) setStatus(next.status as typeof status);
      toast("Đã cập nhật"); router.refresh();
    } catch (e) { toast(e instanceof Error ? e.message : "Thất bại", "err"); }
    setBusy(false);
  }
  async function reveal() {
    if (cccd) { setCccd(null); return; }
    if (!confirm("Xem CCCD đầy đủ? Thao tác này được ghi nhật ký kiểm toán.")) return;
    try {
      const r = await apiFetch<{ cccd: string | null }>(`/api/admin/users/${u.id}/cccd`, { method: "POST", body: {} });
      setCccd(r.cccd ?? "—");
      setTimeout(() => setCccd(null), 15_000); // tu an sau 15s
    } catch (e) { toast(e instanceof Error ? e.message : "Thất bại", "err"); }
  }
  return (
    <tr className="align-middle">
      <td className="p-3"><div className="flex items-center gap-3">
        {u.avatarUrl
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
          : <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm text-ivory">{u.fullName.slice(0, 1)}</span>}
        <div className="min-w-0"><p className="truncate font-medium">{u.fullName}</p><p className="truncate text-xs text-muted">{u.email} <span className={u.emailVerified ? "text-ok" : "text-rose"} title={u.emailVerified ? "Đã xác thực email" : "Chưa xác thực email"}>{u.emailVerified ? "✓" : "✗ chưa xác thực"}</span></p></div></div></td>
      <td className="p-3 text-sm">{u.phone ?? "—"}</td>
      <td className="p-3 text-sm">{u.hasCccd ? (
        <span className="flex items-center gap-2"><code className="text-xs tracking-wider">{cccd ?? u.cccdMasked}</code>
          {canReveal && <button type="button" onClick={reveal} aria-label={cccd ? "Ẩn CCCD" : "Xem CCCD"} className="grid h-8 w-8 place-items-center text-muted hover:text-ink">{cccd ? <EyeOff size={15} /> : <Eye size={15} />}</button>}</span>
      ) : "—"}</td>
      <td className="p-3"><select aria-label="Vai trò" value={role} disabled={busy || u.self} onChange={(e) => save({ role: e.target.value })} className="field !min-h-10 !w-auto !py-1.5 text-sm">
        <option value="customer">Khách hàng</option><option value="editor">Biên tập</option><option value="admin">Quản trị</option></select></td>
      <td className="p-3"><button type="button" disabled={busy || u.self} onClick={() => save({ status: status === "active" ? "blocked" : "active" })}
        className={`px-2.5 py-1 text-[11px] font-semibold ${status === "active" ? "bg-ok/10 text-ok" : "bg-rose/10 text-rose"}`}>{status === "active" ? "Hoạt động" : "Đã khoá"}</button></td>
      <td className="p-3 text-xs text-muted">{new Date(u.createdAt).toLocaleDateString("vi-VN")}</td>
    </tr>
  );
}
