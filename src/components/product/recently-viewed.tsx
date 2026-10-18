"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { ProductCard as P } from "@/server/domain/types";
import { useSessionUser } from "@/components/ui/providers";
import { clearViewed, recentViewed } from "@/lib/history";
import { ProductRow } from "./product-row";

/**
 * "San pham ban da xem": tang ty le quay lai bam mua (affiliate). Khach: localStorage; dang nhap: gop voi tai khoan.
 * Chi hien khi co du lieu, dat cuoi trang -> khong lam nhay layout phan tren.
 */
export function RecentlyViewed({ excludeId, title = "Sản phẩm bạn đã xem" }: { excludeId?: number; title?: string }) {
  const user = useSessionUser();
  const [items, setItems] = useState<P[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        let list: P[] = [];
        if (user) {
          const j = (await (await fetch("/api/me/history", { signal: ac.signal, cache: "no-store" })).json()) as { viewed?: P[] };
          list = j.viewed ?? [];
        }
        const have = new Set(list.map((x) => x.id));
        const local = recentViewed().filter((id) => !have.has(id) && id !== excludeId).slice(0, 12);
        if (local.length) {
          const j = (await (await fetch(`/api/products?ids=${local.join(",")}`, { signal: ac.signal })).json()) as { items?: P[] };
          const order = new Map(local.map((id, i) => [id, i]));
          list = [...(j.items ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)), ...list];
        }
        setItems(list.filter((x) => x.id !== excludeId).slice(0, 10));
      } catch { /* bo qua */ }
    })();
    return () => ac.abort();
  }, [user, excludeId]);

  if (!items.length) return null;
  return (
    <section className="container-x cv-auto pt-14 md:pt-20" aria-labelledby="recent-h">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 id="recent-h" className="font-display text-2xl md:text-3xl">{title}</h2>
        <button type="button" className="flex items-center gap-1 text-xs text-muted hover:text-ink"
          onClick={() => { clearViewed(); setItems([]); if (user) void fetch("/api/me/history?type=view", { method: "DELETE" }).catch(() => {}); }}>
          <X size={13} /> Xoá lịch sử xem
        </button>
      </div>
      <ProductRow items={items} />
    </section>
  );
}
