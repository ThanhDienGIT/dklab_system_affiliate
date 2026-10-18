import type { ProductCard as P } from "@/server/domain/types";
import { ProductCard } from "./product-card";

/** Hang ngang cuon (scroll-snap) - gon tren mobile, 4-5 cot tren desktop */
export function ProductRow({ items }: { items: P[] }) {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 px-4 pb-2 md:-mx-8 md:gap-5 md:scroll-pl-8 md:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0">
      {items.slice(0, 10).map((p) => (
        <div key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-[24vw] xl:w-auto">
          <ProductCard p={p} sizes="(min-width:1280px) 20vw, 44vw" />
        </div>
      ))}
    </div>
  );
}
