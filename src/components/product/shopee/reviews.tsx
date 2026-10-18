"use client";
import { useMemo, useState } from "react";
import { Play, ThumbsUp } from "lucide-react";
import type { ReviewBundle, ReviewDTO } from "@/server/domain/types";
import { cn } from "@/lib/utils";
import { Stars } from "./stars";

type Filter = "all" | 1 | 2 | 3 | 4 | 5 | "comment" | "media";
const PAGE = 5;

export function fmtReviewTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).slice(0, 16);
}
const mask = (name: string) => (name.length <= 2 ? name : `${name[0]}${"*".repeat(Math.min(5, name.length - 2))}${name[name.length - 1]}`);

function Item({ r }: { r: ReviewDTO }) {
  return (
    <li className="flex gap-3 border-b border-[#f0f0f0] py-5 last:border-b-0">
      <div aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#efefef] text-[15px] font-medium uppercase text-[#757575]">{(r.author || "?")[0]}</div>
      <div className="min-w-0 flex-1 text-[14px] text-[#222]">
        <p className="text-[12px]">{r.author ? mask(r.author) : "Người dùng ẩn danh"}</p>
        <Stars rating={r.rating} size={12} className="mt-1" />
        <p className="mt-1 text-[12px] text-[#0000008a]">{[fmtReviewTime(r.reviewedAt), r.variant ? `Phân loại hàng: ${r.variant}` : ""].filter(Boolean).join(" | ")}</p>
        {r.content && <p className="mt-3 whitespace-pre-line break-words leading-relaxed">{r.content}</p>}
        {r.media.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.media.map((m, n) => (
              <li key={m.url + n}>
                <a href={m.url} target="_blank" rel="noopener noreferrer nofollow" aria-label={m.type === "video" ? "Xem video đánh giá" : "Xem ảnh đánh giá"}
                  className="relative block h-[72px] w-[72px] overflow-hidden bg-[#f5f5f5]">
                  {m.type === "video"
                    ? <span className="grid h-full w-full place-items-center bg-black text-white"><Play size={22} fill="currentColor" />{m.duration && <span className="absolute bottom-0.5 right-1 text-[10px]">{m.duration}</span>}</span>
                    // eslint-disable-next-line @next/next/no-img-element
                    : <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />}
                </a>
              </li>
            ))}
          </ul>
        )}
        {r.sellerReply && (
          <div className="mt-3 rounded-[2px] bg-[#f5f5f5] p-3">
            <p className="text-[13px] font-medium">Phản hồi của Người Bán</p>
            <p className="mt-1 whitespace-pre-line text-[13px] text-[#555]">{r.sellerReply}</p>
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-[#0000008a]"><ThumbsUp size={14} />{r.likes > 0 ? r.likes : "Hữu ích?"}</p>
      </div>
    </li>
  );
}

export function ReviewSection({ bundle, rating, reviewCount, breakdown }: {
  bundle: ReviewBundle; rating: number; reviewCount: number;
  breakdown?: { star1?: number | null; star2?: number | null; star3?: number | null; star4?: number | null; star5?: number | null; withComment?: number | null; withMedia?: number | null } | null;
}) {
  const [f, setF] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const { stats } = bundle;
  const cnt = (s: 1 | 2 | 3 | 4 | 5) => breakdown?.[`star${s}` as "star1"] ?? stats.star[s];
  const withComment = breakdown?.withComment ?? stats.withComment;
  const withMedia = breakdown?.withMedia ?? stats.withMedia;
  const avg = rating > 0 ? rating : stats.average;
  const total = reviewCount || stats.total;

  const shown = useMemo(() => bundle.own.filter((r) =>
    f === "all" ? true : f === "comment" ? r.content.trim().length > 0 : f === "media" ? r.media.length > 0 : r.rating === f), [bundle.own, f]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pages);
  const slice = shown.slice((cur - 1) * PAGE, cur * PAGE);

  const chip = (key: Filter, label: string) => (
    <button key={String(key)} type="button" aria-pressed={f === key} onClick={() => { setF(key); setPage(1); }}
      className={cn("min-w-[90px] border bg-white px-3 py-1.5 text-[14px]", f === key ? "border-[#ee4d2d] text-[#ee4d2d]" : "border-[#e0e0e0] text-[#222] hover:border-[#ee4d2d]")}>{label}</button>
  );

  if (!total && !bundle.own.length && !bundle.similar.length) return <p className="py-6 text-center text-sm text-[#757575]">Chưa có đánh giá.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-6 border border-[#ffeee8] bg-[#fffbf8] p-7">
        <div className="text-center text-[#ee4d2d]">
          <p><span className="text-[30px] font-medium">{avg.toFixed(1)}</span> <span className="text-[18px]">trên 5</span></p>
          <Stars rating={avg} size={20} className="mt-1" />
        </div>
        <div className="flex flex-1 flex-wrap gap-2">
          {chip("all", "Tất cả")}
          {([5, 4, 3, 2, 1] as const).map((s) => chip(s, `${s} Sao (${cnt(s)})`))}
          {chip("comment", `Có Bình luận (${withComment})`)}
          {chip("media", `Có Hình ảnh / Video (${withMedia})`)}
        </div>
      </div>

      {slice.length > 0 ? <ul>{slice.map((r) => <Item key={r.id} r={r} />)}</ul> : <p className="py-10 text-center text-sm text-[#757575]">Không có đánh giá phù hợp.</p>}

      {pages > 1 && (
        <nav aria-label="Phân trang đánh giá" className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: Math.min(pages, 7) }, (_, n) => n + 1).map((n) => (
            <button key={n} type="button" aria-current={n === cur} onClick={() => setPage(n)}
              className={cn("h-8 min-w-8 px-2 text-[14px]", n === cur ? "bg-[#ee4d2d] text-white" : "text-[#555] hover:text-[#ee4d2d]")}>{n}</button>
          ))}
        </nav>
      )}

      {bundle.similar.length > 0 && f === "all" && (
        <div className="mt-6 border-t border-[#f0f0f0] pt-5">
          <h3 className="text-[16px] font-medium text-[#222]">Đánh giá sản phẩm tương tự</h3>
          <ul>{bundle.similar.map((r) => <Item key={r.id} r={r} />)}</ul>
        </div>
      )}
    </div>
  );
}
