import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildHref, type CatalogState } from "@/lib/catalog-params";
import type { SortKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Pagination({ path, state, page, pageCount, defaultSort, makeHref, className }: { path: string; state: CatalogState; page: number; pageCount: number; defaultSort: SortKey; makeHref?: (n: number) => string; className?: string }) {
  if (pageCount <= 1) return null;
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pageCount));
  const list = [...pages].sort((a, b) => a - b);
  const href = (n: number) => (makeHref ? makeHref(n) : buildHref(path, state, { page: n }, defaultSort));
  return (
    <nav aria-label="Phân trang" className={cn("mt-14 flex items-center justify-center gap-1", className)}>
      {page > 1 && <Link href={href(page - 1)} aria-label="Trang trước" className="grid h-11 w-11 place-items-center border border-line hover:border-ink"><ChevronLeft size={16} /></Link>}
      {list.map((n, i) => (
        <span key={n} className="flex items-center gap-1">
          {i > 0 && n - (list[i - 1] ?? 0) > 1 && <span className="px-1 text-muted">…</span>}
          <Link href={href(n)} aria-current={n === page ? "page" : undefined}
            className={cn("grid h-11 min-w-11 place-items-center border px-2 text-sm", n === page ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink")}>{n}</Link>
        </span>
      ))}
      {page < pageCount && <Link href={href(page + 1)} aria-label="Trang sau" className="grid h-11 w-11 place-items-center border border-line hover:border-ink"><ChevronRight size={16} /></Link>}
    </nav>
  );
}
