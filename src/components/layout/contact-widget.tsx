"use client";
import { useState } from "react";
import { ArrowUp, Mail, MessageCircle, Phone, X } from "lucide-react";
import type { SiteSettings } from "@/server/domain/settings";
import { cn } from "@/lib/utils";

/** Widget chat noi o goc phai. z-index thap hon moi popup (modal 70+) nen khong bao gio de len popup. */
export function ContactWidget({ contact }: { contact: SiteSettings["contact"] }) {
  const [open, setOpen] = useState(false);
  const items = [
    contact.messenger && { href: contact.messenger, label: "Messenger", icon: <MessageCircle size={18} /> },
    contact.zalo && { href: contact.zalo, label: "Zalo", icon: <MessageCircle size={18} /> },
    contact.hotline && { href: `tel:${contact.hotline.replace(/\s/g, "")}`, label: contact.hotline, icon: <Phone size={18} /> },
    contact.email && { href: `mailto:${contact.email}`, label: "Email", icon: <Mail size={18} /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)] md:bottom-6 md:right-6" style={{ zIndex: "var(--z-widget)" }}>
      <button type="button" aria-label="Lên đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="grid h-11 w-11 place-items-center border border-line bg-paper/95 shadow-md transition hover:border-gold-deep"><ArrowUp size={18} /></button>
      <div className={cn("flex flex-col items-end gap-2 transition-all duration-300", open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0")} aria-hidden={!open}>
        {items.length === 0 && <p className="max-w-52 bg-paper px-3 py-2 text-xs text-muted shadow-md">Chưa cấu hình kênh liên hệ. Vào Quản trị → Cài đặt để thêm.</p>}
        {items.map((i) => (
          <a key={i.label} href={i.href} target={i.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" tabIndex={open ? 0 : -1}
            className="flex items-center gap-2 bg-paper px-3.5 py-2.5 text-sm shadow-md transition hover:text-gold-deep">{i.icon}{i.label}</a>
        ))}
      </div>
      <button type="button" aria-label={open ? "Đóng liên hệ" : "Mở liên hệ"} aria-expanded={open} onClick={() => setOpen(!open)}
        className="grid h-14 w-14 place-items-center rounded-full bg-ink text-ivory shadow-xl transition hover:bg-gold-deep">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
