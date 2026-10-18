"use client";
import { useState } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { cn } from "@/lib/utils";

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const list = images.length ? images : [null];
  return (
    <div className="grid gap-3 md:grid-cols-[72px_1fr]">
      <ul className="no-scrollbar order-2 flex gap-2 overflow-x-auto md:order-1 md:flex-col" aria-label="Ảnh sản phẩm">
        {list.map((src, n) => (
          <li key={n} className="shrink-0">
            <button type="button" onClick={() => setI(n)} aria-label={`Xem ảnh ${n + 1}`} aria-current={n === i}
              className={cn("relative block h-20 w-16 overflow-hidden bg-sand ring-offset-2 ring-offset-ivory transition md:h-24 md:w-[72px]", n === i ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100")}>
              <SmartImage src={src} alt="" sizes="72px" />
            </button>
          </li>
        ))}
      </ul>
      <div className="relative order-1 aspect-[4/5] overflow-hidden bg-sand md:order-2">
        <SmartImage src={list[i]} alt={alt} priority sizes="(min-width:1024px) 45vw, 100vw" />
      </div>
    </div>
  );
}
