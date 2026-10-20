import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

interface Crumb { label: string; href?: string }

/** Tieu de trang quan tri: breadcrumb + tieu de + mo ta + nut thao tac (kieu TailAdmin) */
export function PageHeader({ title, description, crumbs, actions }: { title: ReactNode; description?: ReactNode; crumbs?: Crumb[]; actions?: ReactNode }) {
  const trail: Crumb[] = crumbs ?? (typeof title === "string" ? [{ label: title }] : []);
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <li><Link href="/admin" className="hover:text-gold-deep">Quản trị</Link></li>
            {trail.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1.5">
                <ChevronRight size={12} aria-hidden />
                {c.href && i < trail.length - 1
                  ? <Link href={c.href} className="hover:text-gold-deep">{c.label}</Link>
                  : <span aria-current={i === trail.length - 1 ? "page" : undefined} className="text-ink-soft">{c.label}</span>}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-1.5 text-3xl md:text-[34px]">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
