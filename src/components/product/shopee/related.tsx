import Link from "next/link";
import type { ProductCard } from "@/server/domain/types";
import { SmartImage } from "@/components/ui/smart-image";
import { compactNumber, formatVnd } from "@/lib/format";
import { Stars } from "./stars";

/** Luoi san pham cung loai (the nho kieu Shopee) */
export function RelatedGrid({ items }: { items: ProductCard[] }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/san-pham/${p.slug}`} className="group block h-full overflow-hidden border border-transparent bg-white shadow-[0_1px_1px_0_rgba(0,0,0,.05)] transition hover:-translate-y-px hover:border-[#ee4d2d] hover:shadow-md">
            <div className="relative aspect-square bg-[#f5f5f5]">
              <SmartImage src={p.image} alt={p.name} sizes="(min-width:1280px) 16vw, (min-width:768px) 25vw, 50vw" />
              {p.discountPct > 0 && <span className="absolute right-0 top-0 bg-[#ffd839]/95 px-1.5 py-0.5 text-[12px] font-medium text-[#ee4d2d]">-{p.discountPct}%</span>}
            </div>
            <div className="space-y-1.5 p-2">
              <h3 className="line-clamp-2 min-h-[2.5rem] font-sans text-[12px] font-normal leading-5 text-[#222]">{p.name}</h3>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[16px] font-medium text-[#ee4d2d]">{formatVnd(p.price)}</span>
                {p.sold > 0 && <span className="text-[11px] text-[#757575]">Đã bán {compactNumber(p.sold)}</span>}
              </div>
              {p.rating > 0 && <Stars rating={p.rating} size={11} />}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
