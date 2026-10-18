"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MenuStyle } from "@/server/services/catalog.service";
import { cn } from "@/lib/utils";

const FLAT_L = [{ href: "/moi-ve", label: "Mới về" }, { href: "/ban-chay", label: "Bán chạy" }];
const FLAT_R = [{ href: "/giam-gia", label: "Sale" }];

export function DesktopNav({ menu }: { menu: MenuStyle[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const path = usePathname();
  useEffect(() => setOpen(null), [path]);

  const show = (slug: string) => { clearTimeout(timer.current); setOpen(slug); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(null), 140); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const cur = menu.find((m) => m.slug === open);
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <nav aria-label="Danh mục chính" className="relative" onMouseLeave={hide}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(null); }}>
      <ul className="container-x flex h-11 items-center justify-center gap-x-6 xl:gap-x-9">
        {FLAT_L.map((i) => (
          <li key={i.href}><Link href={i.href} onMouseEnter={hide} className={cn("link-u text-[11px] font-semibold uppercase tracking-[0.2em]", active(i.href) && "text-gold-deep")}>{i.label}</Link></li>
        ))}
        <li aria-hidden className="h-4 w-px bg-line" />
        {menu.map((m) => (
          <li key={m.slug} onMouseEnter={() => show(m.slug)}>
            <Link
              href={m.href}
              aria-expanded={open === m.slug}
              aria-haspopup="true"
              onFocus={() => show(m.slug)}
              className={cn("flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition-colors hover:text-gold-deep",
                (open === m.slug || active(m.href)) && "text-gold-deep")}
            >
              {m.name}
              <ChevronDown size={12} className={cn("transition-transform", open === m.slug && "rotate-180")} />
            </Link>
          </li>
        ))}
        <li aria-hidden className="h-4 w-px bg-line" />
        {FLAT_R.map((i) => (
          <li key={i.href}><Link href={i.href} onMouseEnter={hide} className="link-u text-[11px] font-semibold uppercase tracking-[0.2em] text-rose">{i.label}</Link></li>
        ))}
      </ul>

      {/* Mega menu: cung mot bo submenu cho moi phong cach */}
      <div
        className={cn("absolute inset-x-0 top-full border-b border-line bg-ivory shadow-[0_24px_40px_-24px_rgb(27_22_19/.35)] transition-[opacity,transform,visibility] duration-300",
          cur ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0")}
        style={{ zIndex: "var(--z-mega)" }}
        onMouseEnter={() => cur && show(cur.slug)}
      >
        {cur ? (
          <div className="container-x grid grid-cols-12 gap-8 py-8">
            <div className="col-span-3">
              <p className="eyebrow mb-4">{cur.name}</p>
              <ul className="space-y-1">
                {cur.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={c.href} className="link-u inline-block py-1.5 text-[15px] hover:text-gold-deep">{c.name}</Link>
                  </li>
                ))}
              </ul>
              <Link href={cur.href} className="mt-5 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-deep underline underline-offset-4">
                Khám phá phong cách {cur.name}
              </Link>
            </div>
            <div className="col-span-9 grid grid-cols-3 gap-4">
              {cur.images.slice(0, 3).map((src, i) => (
                <Link key={src} href={cur.children[i]?.href ?? cur.href} className="group relative block aspect-[4/5] overflow-hidden bg-sand">
                  <Image src={src} alt={`${cur.name} - ${cur.children[i]?.name ?? ""}`} fill sizes="(min-width:1280px) 280px, 22vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent p-3 text-xs font-semibold uppercase tracking-[0.18em] text-ivory">
                    {cur.children[i]?.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
