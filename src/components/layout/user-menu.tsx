"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Shield, User, UserRound } from "lucide-react";
import type { SessionUser } from "@/server/domain/types";
import { apiFetch } from "@/lib/api-client";

export function UserMenu({ user }: { user: SessionUser | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!user) {
    return <Link href="/dang-nhap" aria-label="Đăng nhập" className="grid h-11 w-11 place-items-center transition hover:text-gold-deep"><UserRound size={21} strokeWidth={1.5} /></Link>;
  }
  const logout = async () => {
    await apiFetch("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
    setOpen(false);
    router.push("/");
    router.refresh();
  };
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Tài khoản" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-gold-soft" />
        ) : <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-semibold text-ivory">{user.fullName.slice(0, 1).toUpperCase()}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-60 border border-line bg-paper p-2 shadow-xl animate-fade-up" style={{ zIndex: "var(--z-mega)" }}>
          <div className="border-b border-line px-3 pb-2 pt-1">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link role="menuitem" href="/tai-khoan" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-sand"><User size={15} /> Thông tin & phong cách</Link>
          <Link role="menuitem" href="/yeu-thich" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-sand">♡ Yêu thích</Link>
          {user.role !== "customer" && <Link role="menuitem" href="/admin" className="flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-sand"><Shield size={15} /> Quản trị</Link>}
          <button role="menuitem" type="button" onClick={logout} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-sand"><LogOut size={15} /> Đăng xuất</button>
        </div>
      )}
    </div>
  );
}
