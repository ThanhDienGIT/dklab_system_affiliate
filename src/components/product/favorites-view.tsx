"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductCard as P } from "@/server/domain/types";
import { useFavorites } from "@/components/ui/providers";
import { ProductCard } from "./product-card";

export function FavoritesView() {
  const { ids, ready } = useFavorites();
  const [items, setItems] = useState<P[] | null>(null);
  const key = [...ids].sort().join(",");
  useEffect(() => {
    if (!ready) return;
    if (!key) { setItems([]); return; }
    let alive = true;
    fetch(`/api/products?ids=${key}`).then((r) => r.json()).then((j: { items: P[] }) => { if (alive) setItems(j.items); }).catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [key, ready]);

  if (!ready || items === null) return <p className="py-16 text-center text-sm text-muted">Đang tải…</p>;
  const shown = items.filter((p) => ids.has(p.id));
  if (!shown.length) {
    return (
      <div className="grid place-items-center gap-4 border border-dashed border-line py-20 text-center">
        <p className="font-display text-3xl">Chưa có sản phẩm yêu thích</p>
        <p className="text-sm text-muted">Nhấn biểu tượng trái tim trên sản phẩm để lưu lại.</p>
        <Link href="/moi-ve" className="btn btn-solid">Khám phá hàng mới</Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 xl:grid-cols-5">
      {shown.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  );
}
