import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { MenuStyle } from "@/server/services/catalog.service";
import { cn } from "@/lib/utils";

/** Cay danh muc dang accordion (nhu menu ben trai): moi phong cach co cung bo the loai. Dung <details> nen khong can JS. */
export function StyleTree({ menu, style, category }: { menu: MenuStyle[]; style?: string; category?: string }) {
  return (
    <nav aria-label="Danh mục phong cách" className="mb-8 border-b border-line pb-6">
      <p className="eyebrow mb-3">Danh mục</p>
      <ul>
        {menu.map((m) => (
          <li key={m.slug} className="border-b border-line/60 last:border-0">
            <details open={m.slug === style} className="group">
              <summary className={cn("flex min-h-11 cursor-pointer list-none items-center justify-between text-[13px] font-semibold uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden", m.slug === style && "text-gold-deep")}>
                {m.name}
                <ChevronRight size={15} className="transition-transform group-open:rotate-90" />
              </summary>
              <ul className="pb-3 pl-3">
                <li><Link href={m.href} className={cn("block py-1.5 text-sm hover:text-gold-deep", m.slug === style && !category && "font-semibold text-gold-deep")}>Tất cả</Link></li>
                {m.children.map((c) => (
                  <li key={c.slug}>
                    <Link href={c.href} className={cn("block py-1.5 text-sm hover:text-gold-deep", m.slug === style && c.slug === category && "font-semibold text-gold-deep")}>{c.name}</Link>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </nav>
  );
}
