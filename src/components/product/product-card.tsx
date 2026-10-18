import Link from "next/link";
import type { ProductCard as P } from "@/server/domain/types";
import { COLORS } from "@/lib/constants";
import { formatVnd } from "@/lib/format";
import { SmartImage } from "@/components/ui/smart-image";
import { FavoriteButton } from "./favorite-button";

export function ProductCard({ p, priority, showStyle = true, sizes }: { p: P; priority?: boolean; showStyle?: boolean; sizes?: string }) {
  const dots = p.colors.slice(0, 5).map((c) => COLORS.find((x) => x.slug === c)).filter(Boolean);
  return (
    <article className="group relative">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        <Link href={`/san-pham/${p.slug}`} aria-label={p.name} className="absolute inset-0 block">
          <SmartImage src={p.image} alt={p.name} priority={priority} sizes={sizes ?? "(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw"}
            className="transition-all duration-700 ease-[var(--ease-lux)] group-hover:scale-[1.03]" />
          {/* anh thu 2 chi tai tren thiet bi co hover (desktop): mobile khong ton bang thong */}
          {p.image2 ? (
            <SmartImage src={p.image2} alt="" sizes={sizes ?? "(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw"}
              className="hidden opacity-0 transition-opacity duration-500 group-hover:opacity-100 [@media(hover:hover)]:block" />
          ) : null}
        </Link>
        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {p.discountPct > 0 && <span className="bg-rose px-2 py-0.5 text-[11px] font-semibold text-white">-{p.discountPct}%</span>}
          {p.badge && <span className="bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory">{p.badge}</span>}
        </div>
        <FavoriteButton productId={p.id} name={p.name} className="absolute right-0.5 top-0.5" />
      </div>
      <div className="pt-3">
        {showStyle && <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-deep">{p.style.name}</p>}
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.6em] font-sans text-[13.5px] font-medium leading-snug tracking-normal">
          <Link href={`/san-pham/${p.slug}`} className="hover:text-gold-deep">{p.name}</Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="font-semibold">{formatVnd(p.price)}</span>
          {p.originalPrice ? <s className="text-xs text-muted">{formatVnd(p.originalPrice)}</s> : null}
        </p>
        {dots.length > 0 && (
          <ul className="mt-2 flex gap-1.5" aria-label="Màu sắc">
            {dots.map((c) => <li key={c!.slug} title={c!.name} className="h-3 w-3 rounded-full border border-ink/15" style={{ background: c!.hex }} />)}
            {p.colors.length > 5 && <li className="text-[10px] text-muted">+{p.colors.length - 5}</li>}
          </ul>
        )}
      </div>
    </article>
  );
}
