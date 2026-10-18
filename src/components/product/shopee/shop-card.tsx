import { Store } from "lucide-react";
import type { ProductExtra } from "@/server/domain/types";
import { SmartImage } from "@/components/ui/smart-image";

export function ShopCard({ shop }: { shop: NonNullable<ProductExtra["shop"]> }) {
  const stats: [string, string | null | undefined][] = [
    ["Đánh giá", shop.ratingCount], ["Tỉ lệ phản hồi", shop.responseRate], ["Tham gia", shop.joined],
    ["Sản phẩm", shop.productCount], ["Thời gian phản hồi", shop.responseTime], ["Người theo dõi", shop.followers],
  ];
  const href = shop.url && /^https?:\/\//i.test(shop.url) ? shop.url : null;
  return (
    <section className="flex flex-wrap items-center gap-x-10 gap-y-5 bg-white p-6" aria-label="Thông tin shop">
      <div className="flex items-center gap-4 md:border-r md:border-[#efefef] md:pr-10">
        <div className="relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#efefef] text-[#999]">
          {shop.avatar ? <SmartImage src={shop.avatar} alt="" sizes="80px" /> : <Store size={30} />}
        </div>
        <div className="text-[#222]">
          <p className="max-w-[220px] truncate text-[16px] font-medium">{shop.name}</p>
          {shop.online && <p className="mt-0.5 text-[13px] text-[#757575]">{shop.online}</p>}
          {href && <a href={href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="mt-3 inline-flex h-8 items-center border border-[#ee4d2d] bg-[#ffeee8] px-4 text-[13px] uppercase text-[#ee4d2d] hover:bg-[#fff5f1]">Xem shop</a>}
        </div>
      </div>
      <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-4 text-[14px] md:grid-cols-3">
        {stats.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 md:justify-start"><dt className="text-[#757575]">{k}</dt><dd className="font-medium text-[#ee4d2d]">{v}</dd></div>
        ))}
      </dl>
    </section>
  );
}
