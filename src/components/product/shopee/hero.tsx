"use client";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, ShieldCheck, Truck } from "lucide-react";
import type { VariantGroup } from "@/server/domain/types";
import { SmartImage } from "@/components/ui/smart-image";
import { FavoriteButton } from "@/components/product/favorite-button";
import { cn } from "@/lib/utils";
import { Stars } from "./stars";

export interface HeroProps {
  productId: number; name: string; images: string[]; video?: { url: string; poster?: string | null } | null;
  priceText: string; originalPriceText: string | null; discountPct: number;
  rating: number; ratingCountText: string; soldText: string; likeText: string | null;
  variants: VariantGroup[]; stockText: string | null;
  shipping?: { text?: string | null; from?: string | null; eta?: string | null; fee?: string | null; voucher?: string | null } | null;
  guarantees: string[]; merchantName: string; cta: string; goHref: string; isDemo: boolean; disclosure: string;
}

const O = "#ee4d2d";

export function ProductHero(p: HeroProps) {
  const media = [
    ...(p.video?.url ? [{ type: "video" as const, src: p.video.url, poster: p.video.poster ?? p.images[0] ?? null }] : []),
    ...p.images.map((src) => ({ type: "image" as const, src, poster: null })),
  ];
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [override, setOverride] = useState<string | null>(null);
  const strip = useRef<HTMLUListElement>(null);
  const cur = media[i];

  const pick = (group: string, opt: { name: string; image?: string | null }) => {
    const on = picked[group] === opt.name;
    setPicked((s) => { const n = { ...s }; if (on) delete n[group]; else n[group] = opt.name; return n; });
    setOverride(!on && opt.image ? opt.image : null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,450px)_minmax(0,1fr)] md:gap-8">
      {/* ===== Anh / video ===== */}
      <div>
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          {override ? (
            <SmartImage src={override} alt={p.name} priority sizes="(min-width:768px) 450px, 100vw" />
          ) : cur?.type === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video key={cur.src} src={cur.src} poster={cur.poster ?? undefined} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />
          ) : (
            <SmartImage src={cur?.src ?? null} alt={p.name} priority sizes="(min-width:768px) 450px, 100vw" />
          )}
        </div>
        {media.length > 1 && (
          <div className="relative mt-2">
            <ul ref={strip} className="no-scrollbar flex gap-[10px] overflow-x-auto scroll-smooth" aria-label="Ảnh sản phẩm">
              {media.map((m, n) => (
                <li key={m.src + n} className="w-[calc((100%-40px)/5)] shrink-0">
                  <button type="button" aria-label={m.type === "video" ? "Xem video" : `Xem ảnh ${n + 1}`} aria-current={n === i && !override}
                    onMouseEnter={() => { setI(n); setOverride(null); }} onClick={() => { setI(n); setOverride(null); }}
                    className={cn("relative block aspect-square w-full overflow-hidden border-2 bg-white", n === i && !override ? "border-[#ee4d2d]" : "border-transparent")}>
                    <SmartImage src={m.type === "video" ? m.poster : m.src} alt="" sizes="90px" />
                    {m.type === "video" && <span className="absolute inset-0 grid place-items-center bg-black/30 text-white"><Play size={20} fill="currentColor" /></span>}
                  </button>
                </li>
              ))}
            </ul>
            {media.length > 5 && (<>
              <button type="button" aria-label="Ảnh trước" onClick={() => strip.current?.scrollBy({ left: -strip.current.clientWidth * 0.6 })}
                className="absolute left-0 top-1/2 grid h-8 w-5 -translate-y-1/2 place-items-center bg-black/40 text-white hover:bg-black/60"><ChevronLeft size={16} /></button>
              <button type="button" aria-label="Ảnh sau" onClick={() => strip.current?.scrollBy({ left: strip.current.clientWidth * 0.6 })}
                className="absolute right-0 top-1/2 grid h-8 w-5 -translate-y-1/2 place-items-center bg-black/40 text-white hover:bg-black/60"><ChevronRight size={16} /></button>
            </>)}
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-1 text-sm text-[#222]">
          <FavoriteButton productId={p.productId} name={p.name} size={22} className="!h-9 !w-9" />
          <span>Đã thích{p.likeText ? ` (${p.likeText})` : ""}</span>
        </div>
      </div>

      {/* ===== Thong tin ===== */}
      <div className="min-w-0 text-[#222]">
        <h1 className="font-sans text-[20px] font-medium leading-[1.4] md:text-[20px]">
          <span className="mr-2 inline-block rounded-[2px] bg-[#ee4d2d] px-1.5 py-[1px] align-middle text-[12px] font-normal leading-4 text-white">Yêu thích</span>
          {p.name}
        </h1>

        <div className="mt-3 flex flex-wrap items-center text-[14px]">
          {p.rating > 0 && (
            <div className="flex items-center gap-1.5 border-r border-[#e8e8e8] pr-4">
              <span className="border-b border-[#ee4d2d] font-medium text-[#ee4d2d]">{p.rating.toFixed(1)}</span><Stars rating={p.rating} size={16} />
            </div>
          )}
          <div className="flex items-center gap-1.5 border-r border-[#e8e8e8] px-4"><span className="border-b border-[#222] font-medium">{p.ratingCountText}</span><span className="text-[#767676]">đánh giá</span></div>
          <div className="flex items-center gap-1.5 pl-4"><span className="font-medium">{p.soldText}</span><span className="text-[#767676]">Đã bán</span></div>
        </div>

        <div className="mt-4 bg-[#fafafa] px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {p.originalPriceText && <s className="text-[16px] text-[#929292]">{p.originalPriceText}</s>}
            <span className="text-[30px] font-medium leading-none text-[#ee4d2d]">{p.priceText}</span>
            {p.discountPct > 0 && <span className="rounded-[2px] bg-[#ee4d2d] px-1 text-[12px] font-semibold uppercase leading-5 text-white">{p.discountPct}% giảm</span>}
          </div>
        </div>

        <dl className="mt-6 space-y-5 text-[14px]">
          {(p.shipping?.text || p.shipping?.eta || p.shipping?.from) && (
            <div className="grid grid-cols-[110px_1fr] gap-x-4">
              <dt className="pt-0.5 text-[#757575] capitalize">Vận chuyển</dt>
              <dd className="space-y-1.5">
                <p className="flex items-start gap-2"><Truck size={18} className="mt-0.5 shrink-0 text-[#26aa99]" />
                  <span>{[p.shipping?.text, p.shipping?.eta].filter(Boolean).join(" | ")}{p.shipping?.fee ? <span className="text-[#757575]"> · {p.shipping.fee}</span> : null}</span></p>
                {p.shipping?.from && <p className="text-[#757575]">Gửi từ {p.shipping.from}</p>}
                {p.shipping?.voucher && <p className="text-[#757575]">{p.shipping.voucher}</p>}
              </dd>
            </div>
          )}
          {p.guarantees.length > 0 && (
            <div className="grid grid-cols-[110px_1fr] gap-x-4">
              <dt className="pt-0.5 text-[#757575]">An tâm mua sắm</dt>
              <dd className="flex flex-wrap gap-x-5 gap-y-1">{p.guarantees.map((g) => <span key={g} className="flex items-center gap-1.5"><ShieldCheck size={16} className="text-[#ee4d2d]" />{g}</span>)}</dd>
            </div>
          )}

          {p.variants.map((g) => (
            <div key={g.name} className="grid grid-cols-[110px_1fr] gap-x-4">
              <dt className="pt-2 text-[#757575]">{g.name}</dt>
              <dd className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const on = picked[g.name] === o.name;
                  return (
                    <button key={o.name} type="button" aria-pressed={on} onClick={() => pick(g.name, o)}
                      className={cn("relative flex min-h-9 min-w-[60px] items-center justify-center gap-1.5 border bg-white px-3 py-1.5 text-[14px] transition",
                        on ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-[#e0e0e0] hover:border-[#ee4d2d] hover:text-[#ee4d2d]")}>
                      {o.image && <span className="relative block h-6 w-6 shrink-0 overflow-hidden"><SmartImage src={o.image} alt="" sizes="24px" /></span>}
                      {o.name}
                      {on && <span aria-hidden className="absolute bottom-0 right-0 h-0 w-0 border-b-[14px] border-l-[14px] border-b-[#ee4d2d] border-l-transparent" />}
                    </button>
                  );
                })}
              </dd>
            </div>
          ))}

          {p.stockText && (
            <div className="grid grid-cols-[110px_1fr] items-center gap-x-4">
              <dt className="text-[#757575]">Số lượng</dt><dd className="text-[#757575]">{p.stockText}</dd>
            </div>
          )}
        </dl>

        <div className="mt-8 hidden flex-wrap gap-3 md:flex">
          <a href={p.goHref} target="_blank" rel="sponsored nofollow noopener noreferrer"
            className="flex h-12 min-w-[220px] items-center justify-center rounded-[2px] px-6 text-[15px] font-medium text-white transition hover:opacity-90" style={{ background: O }}>
            {p.cta}
          </a>
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#757575]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#26aa99]" />
          <span>Bạn sẽ được chuyển sang {p.merchantName} để chọn phân loại, kiểm tra giá và đặt hàng. {p.disclosure}</span>
        </p>
        {p.isDemo && <p className="mt-4 border border-dashed border-[#d0d0d0] p-3 text-xs text-[#757575]">Sản phẩm mẫu (demo): liên kết đang trỏ tới trang tìm kiếm. Thay bằng link affiliate thật trong Admin.</p>}
      </div>
    </div>
  );
}
