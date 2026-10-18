import type { CSSProperties } from "react";
import type { ProductCard as P } from "@/server/domain/types";
import { cn } from "@/lib/utils";
import { ProductCard } from "./product-card";

/**
 * Luoi san pham = Server Component, hieu ung bang CSS (.card-in) thay vi Motion:
 * - khong can JS de hien san pham (truoc day opacity:0 cho toi khi hydrate -> LCP cham)
 * - 8 card dau stagger nhe, card sau hien theo cuon (scroll-driven, fallback: hien luon)
 */
export function ProductGrid({ items, cols = 4, showStyle = true, priorityFirst = 0 }: { items: P[]; cols?: 3 | 4 | 5; showStyle?: boolean; priorityFirst?: number }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 md:gap-y-10",
      cols === 3 && "md:grid-cols-3", cols === 4 && "md:grid-cols-3 xl:grid-cols-4", cols === 5 && "md:grid-cols-3 xl:grid-cols-5")}>
      {items.map((p, i) => (
        <li key={p.id} className="card-in" data-below={i >= 8 ? "" : undefined} style={{ "--i": i } as CSSProperties}>
          <ProductCard p={p} showStyle={showStyle} priority={i < priorityFirst} />
        </li>
      ))}
    </ul>
  );
}
