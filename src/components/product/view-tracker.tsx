"use client";
import { useEffect } from "react";
import { pushViewed, shouldCountView } from "@/lib/history";

/** Ghi luot xem khi trinh duyet ranh (sau khi trang da ve xong) bang sendBeacon -> 0ms anh huong toi trai nghiem. */
export function ViewTracker({ productId }: { productId: number }) {
  useEffect(() => {
    pushViewed(productId);
    if (!shouldCountView(productId)) return;
    const fromSearch = (() => { try { return new URL(document.referrer).pathname.startsWith("/tim-kiem"); } catch { return false; } })();
    const send = () => {
      const payload = JSON.stringify({ productId, fromSearch });
      const ok = navigator.sendBeacon?.("/api/track/view", new Blob([payload], { type: "application/json" }));
      if (!ok) void fetch("/api/track/view", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (h: number) => void };
    if (w.requestIdleCallback) { const h = w.requestIdleCallback(send, { timeout: 3000 }); return () => w.cancelIdleCallback?.(h); }
    const t = setTimeout(send, 1200);
    return () => clearTimeout(t);
  }, [productId]);
  return null;
}
