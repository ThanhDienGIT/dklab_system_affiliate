"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Shield, User } from "lucide-react";
import type { MenuStyle } from "@/server/services/catalog.service";
import type { SessionUser } from "@/server/domain/types";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export function MobileMenu({ menu, user, brand }: { menu: MenuStyle[]; user: SessionUser | null; brand: string }) {
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState<string | null>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="lg:hidden">
      <button type="button" aria-label="Mở menu" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center">
        <Menu size={23} strokeWidth={1.5} />
      </button>
      <Modal open={open} onOpenChange={setOpen} title={brand.toUpperCase()} side="left" className="pb-10">
        <nav aria-label="Menu di động" className="mt-4 px-6">
          <ul className="divide-y divide-line border-y border-line text-[13px] font-semibold uppercase tracking-[0.16em]">
            <li><Link href="/moi-ve" className="block py-3.5">Mới về</Link></li>
            <li><Link href="/ban-chay" className="block py-3.5">Bán chạy</Link></li>
            {menu.map((m) => (
              <li key={m.slug}>
                <button type="button" aria-expanded={exp === m.slug} onClick={() => setExp(exp === m.slug ? null : m.slug)}
                  className="flex w-full items-center justify-between py-3.5 text-left uppercase tracking-[0.16em]">
                  {m.name}
                  <ChevronDown size={16} className={cn("transition-transform", exp === m.slug && "rotate-180")} />
                </button>
                <div className={cn("grid transition-[grid-template-rows] duration-300", exp === m.slug ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                  <ul className="overflow-hidden text-[14px] font-normal normal-case tracking-normal">
                    <li><Link href={m.href} tabIndex={exp === m.slug ? 0 : -1} className="block py-2.5 pl-4 text-gold-deep">Tất cả {m.name}</Link></li>
                    {m.children.map((c) => (
                      <li key={c.slug}><Link href={c.href} tabIndex={exp === m.slug ? 0 : -1} className="block border-l border-line py-2.5 pl-4">{c.name}</Link></li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
            <li><Link href="/giam-gia" className="block py-3.5 text-rose">Sale</Link></li>
          </ul>
          <ul className="mt-6 space-y-1 text-sm">
            {user ? (
              <>
                <li><Link href="/tai-khoan" className="flex items-center gap-2 py-2"><User size={16} /> {user.fullName}</Link></li>
                {user.role !== "customer" && <li><Link href="/admin" className="flex items-center gap-2 py-2"><Shield size={16} /> Quản trị</Link></li>}
              </>
            ) : (
              <>
                <li><Link href="/dang-nhap" className="block py-2">Đăng nhập</Link></li>
                <li><Link href="/dang-ky" className="block py-2">Tạo tài khoản</Link></li>
              </>
            )}
            <li><Link href="/yeu-thich" className="block py-2">Yêu thích</Link></li>
          </ul>
        </nav>
      </Modal>
    </div>
  );
}
