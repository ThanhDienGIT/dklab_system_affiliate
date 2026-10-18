"use client";
import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { NewsletterForm } from "./newsletter-form";
import { usePathname } from "next/navigation";

/**
 * Popup dang ky: chi hien 1 lan / phien, khong hien o trang tai khoan/admin/dang nhap,
 * khong hien khi nguoi dung da dang ky hoac da dong trong 7 ngay.
 */
export function NewsletterPopup({ enabled, delaySec, title, body, loggedIn }: { enabled: boolean; delaySec: number; title: string; body: string; loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const blocked = /^\/(admin|tai-khoan|dang-nhap|dang-ky)/.test(path);

  useEffect(() => {
    if (!enabled || loggedIn || blocked) return;
    try {
      if (localStorage.getItem("el_nl") === "1" || sessionStorage.getItem("el_nl_seen") === "1") return;
      const until = Number(localStorage.getItem("el_nl_until") ?? 0);
      if (until > Date.now()) return;
    } catch { /* private mode: van hien */ }
    const t = setTimeout(() => { setOpen(true); try { sessionStorage.setItem("el_nl_seen", "1"); } catch { /* */ } }, delaySec * 1000);
    return () => clearTimeout(t);
  }, [enabled, delaySec, loggedIn, blocked]);

  const change = (v: boolean) => {
    setOpen(v);
    if (!v) { try { localStorage.setItem("el_nl_until", String(Date.now() + 7 * 864e5)); } catch { /* */ } }
  };
  return (
    <Modal open={open} onOpenChange={change} title={title} description={body}>
      <div className="px-6 pb-7 pt-5">
        <p className="eyebrow mb-3 text-center">Éleonore Circle</p>
        <NewsletterForm onDone={() => setTimeout(() => change(false), 1600)} />
      </div>
    </Modal>
  );
}
