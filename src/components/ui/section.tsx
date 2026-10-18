import Link from "next/link";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

export function SectionHead({ eyebrow, title, href, linkLabel = "Xem tất cả", sub }: { eyebrow?: string; title: string; href?: string; linkLabel?: string; sub?: string }) {
  return (
    <Reveal className="mb-8 text-center md:mb-10">
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{sub}</p>}
      {href && <Link href={href} className="link-u mt-4 inline-block text-[11px] font-semibold uppercase tracking-[0.22em]">{linkLabel} →</Link>}
    </Reveal>
  );
}

export function Section({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`container-x pt-14 md:pt-20 ${className}`}>{children}</section>;
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container-x pt-5 text-xs text-muted">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-2">
            {it.href && i < items.length - 1 ? <Link href={it.href} className="hover:text-gold-deep">{it.label}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined} className={i === items.length - 1 ? "text-ink" : ""}>{it.label}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
