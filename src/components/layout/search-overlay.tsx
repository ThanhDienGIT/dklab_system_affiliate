"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Clock, Search, Sparkles, TrendingUp, X } from "lucide-react";
import type { ProductCard } from "@/server/domain/types";
import { formatVnd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSessionUser } from "@/components/ui/providers";
import { clearSearches, mergeSearches, pushSearch, recentSearches, removeSearch } from "@/lib/history";

const EXAMPLES = ["Quần áo phong cách y2k", "quần áo y2k dưới 500k", "đầm babydoll y2k", "túi xách maximalism", "váy gloomy coquette màu đen"];

export function SearchButton({ variant }: { variant: "bar" | "icon" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "bar" ? (
        <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-56 items-center gap-2 border border-line px-3 text-left text-sm text-muted transition hover:border-gold-deep xl:w-72">
          <Search size={16} /> <span className="truncate">Tìm kiếm thông minh…</span>
        </button>
      ) : (
        <button type="button" aria-label="Tìm kiếm" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center"><Search size={21} strokeWidth={1.5} /></button>
      )}
      <SearchOverlay open={open} onOpenChange={setOpen} />
    </>
  );
}

interface FastResult { items: ProductCard[]; total: number; labels: string[] }

function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<FastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const abort = useRef<AbortController | null>(null);
  const user = useSessionUser();
  const [recent, setRecent] = useState<string[]>([]);
  const [popular, setPopular] = useState<string[]>([]);

  // Mo overlay: doc lich su may nay ngay (0ms), roi gop lich su tai khoan + tu khoa pho bien (song song)
  useEffect(() => {
    if (!open) return;
    setRecent(recentSearches());
    const ac = new AbortController();
    void fetch("/api/search/popular", { signal: ac.signal }).then((r) => r.json()).then((j: { items?: string[] }) => setPopular(j.items ?? [])).catch(() => {});
    if (user) void fetch("/api/me/history", { signal: ac.signal, cache: "no-store" }).then((r) => r.json())
      .then((j: { searches?: string[] }) => setRecent(mergeSearches(j.searches ?? []))).catch(() => {});
    return () => ac.abort();
  }, [open, user]);

  const clearAll = () => {
    clearSearches(); setRecent([]);
    if (user) void fetch("/api/me/history?type=search", { method: "DELETE" }).catch(() => {});
  };

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRes(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ac = new AbortController();
      abort.current = ac;
      try {
        const r = await fetch(`/api/search?mode=fast&q=${encodeURIComponent(term)}`, { signal: ac.signal });
        if (r.ok) setRes((await r.json()) as FastResult);
      } catch { /* bi huy hoac mat mang */ }
      if (!ac.signal.aborted) setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    pushSearch(t);
    onOpenChange(false);
    router.push(`/tim-kiem?q=${encodeURIComponent(t)}`);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setQ(""); setRes(null); } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/55 backdrop-blur-[2px]" style={{ zIndex: "var(--z-modal-overlay)" }} />
        <Dialog.Content
          aria-describedby={undefined}
          data-lenis-prevent
          className="fixed inset-x-0 top-0 max-h-dvh overflow-y-auto overscroll-contain bg-ivory shadow-2xl outline-none"
          style={{ zIndex: "var(--z-modal)" }}
        >
          <Dialog.Title className="sr-only">Tìm kiếm sản phẩm</Dialog.Title>
          <form onSubmit={(e) => { e.preventDefault(); go(q); }} className="container-x flex items-center gap-3 border-b border-line py-3">
            <Search size={20} className="shrink-0 text-muted" />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} type="search" enterKeyHint="search" autoComplete="off"
              placeholder="Thử: quần áo y2k dưới 500k" aria-label="Từ khoá tìm kiếm"
              className="h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
            />
            <Dialog.Close aria-label="Đóng tìm kiếm" className="grid h-11 w-11 place-items-center"><X size={20} /></Dialog.Close>
          </form>

          <div className="container-x py-6">
            {!res && !loading && (
              <div className="space-y-7">
                {recent.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <p className="eyebrow flex items-center gap-1.5"><Clock size={13} /> Tìm kiếm gần đây</p>
                      <button type="button" onClick={clearAll} className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline">Xoá lịch sử</button>
                    </div>
                    <ul className="flex flex-wrap gap-2">
                      {recent.map((e) => (
                        <li key={e} className="group flex items-center border border-line text-sm transition hover:border-gold-deep">
                          <button type="button" onClick={() => go(e)} className="py-2 pl-3 pr-1 hover:text-gold-deep">{e}</button>
                          <button type="button" aria-label={`Xoá “${e}”`} onClick={() => { removeSearch(e); setRecent((r) => r.filter((x) => x !== e)); }}
                            className="grid h-8 w-8 place-items-center text-muted hover:text-ink"><X size={13} /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <p className="eyebrow mb-3 flex items-center gap-1.5">{popular.length ? <><TrendingUp size={13} /> Đang được tìm nhiều</> : "Gợi ý tìm kiếm"}</p>
                  <div className="flex flex-wrap gap-2">
                    {(popular.length ? popular : EXAMPLES).map((e) => (
                      <button key={e} type="button" onClick={() => go(e)} className="border border-line px-3 py-2 text-sm transition hover:border-gold-deep hover:text-gold-deep">{e}</button>
                    ))}
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted"><Sparkles size={13} className="text-gold" /> Gõ tự nhiên: phong cách, thể loại, màu và mức giá sẽ được hiểu tự động.</p>
              </div>
            )}
            {loading && !res && <p className="text-sm text-muted">Đang tìm…</p>}
            {res && (
              <div className={cn(loading && "opacity-60 transition-opacity")}>
                {res.labels.length > 0 && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted"><Sparkles size={13} className="text-gold" /> Hiểu là:</span>
                    {res.labels.map((l) => <span key={l} className="bg-sand px-2.5 py-1 text-xs font-medium">{l}</span>)}
                  </div>
                )}
                {res.items.length === 0 ? (
                  <p className="text-sm text-muted">Chưa thấy sản phẩm phù hợp. Nhấn Enter để xem gợi ý gần nhất.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-6">
                    {res.items.map((p) => (
                      <li key={p.id}>
                        <Link href={`/san-pham/${p.slug}`} onClick={() => onOpenChange(false)} className="group block">
                          <div className="relative aspect-[4/5] overflow-hidden bg-sand">
                            {p.image && !p.image.startsWith("data:") ? <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 16vw, 33vw" className="object-cover" /> : null}
                          </div>
                          <p className="mt-2 line-clamp-2 text-[13px] leading-snug group-hover:text-gold-deep">{p.name}</p>
                          <p className="text-[13px] font-semibold">{formatVnd(p.price)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => go(q)} className="btn btn-solid mt-6">Xem tất cả {res.total} kết quả</button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
