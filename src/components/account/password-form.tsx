"use client";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/providers";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const toast = useToast();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setBusy(true); setErr({});
    try {
      await apiFetch("/api/me", { method: "PATCH", body: { current: f.get("current") || "-", next: f.get("next") } });
      toast("Đã đổi mật khẩu. Các thiết bị khác sẽ được đăng xuất.");
      form.reset();
      setTimeout(() => location.assign("/dang-nhap"), 1200);
    } catch (e2) {
      if (e2 instanceof ApiError) { setErr(e2.fields ?? { _: e2.message }); toast(e2.message, "err"); } else toast("Đổi mật khẩu thất bại", "err");
    }
    setBusy(false);
  }
  return (
    <form onSubmit={submit} className="grid max-w-md gap-4" noValidate>
      {hasPassword ? (
        <div><label className="label" htmlFor="current">Mật khẩu hiện tại</label>
          <input id="current" name="current" type="password" autoComplete="current-password" className="field" required />{err.current && <p className="mt-1 text-xs text-rose">{err.current}</p>}</div>
      ) : <p className="text-sm text-muted">Tài khoản này đăng nhập bằng Google. Bạn có thể đặt thêm mật khẩu để đăng nhập bằng email.</p>}
      <div><label className="label" htmlFor="next">Mật khẩu mới</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} className="field" required />{err.next && <p className="mt-1 text-xs text-rose">{err.next}</p>}</div>
      <div><button className="btn btn-ghost" disabled={busy}>{busy ? "Đang lưu…" : hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}</button></div>
    </form>
  );
}
