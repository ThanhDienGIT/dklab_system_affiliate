import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getContainer } from "@/server/container";
import { COLORS, MERCHANTS } from "@/lib/constants";
import { compactNumber, formatVnd } from "@/lib/format";
import { ProductHero } from "@/components/product/shopee/hero";
import { ReviewSection } from "@/components/product/shopee/reviews";
import { ShopCard } from "@/components/product/shopee/shop-card";
import { RelatedGrid } from "@/components/product/shopee/related";
import { RelatedSkeleton, SectionSkeleton } from "@/components/ui/skeletons";
import { ViewTracker } from "@/components/product/view-tracker";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import type { ProductDetail } from "@/server/domain/types";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getContainer().catalog.detail((await params).slug);
  if (!p || p.status !== "published") return { robots: { index: false } };
  return {
    title: p.name, description: `${p.name} - phong cách ${p.style.name}, ${p.category.name}. Giá ${formatVnd(p.price)}.`,
    openGraph: { images: p.images[0] && !p.images[0].startsWith("data:") ? [p.images[0]] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const c = getContainer();
  const p = await c.catalog.detail((await params).slug);
  if (!p || p.status !== "published") notFound();
  // Chi doi phan tren man hinh; danh gia + lien quan stream sau trong <Suspense>
  const settings = await c.catalog.settings();
  const m = MERCHANTS[p.merchant] ?? MERCHANTS.other!;
  const go = `/go/${p.slug}?src=detail`;
  const d = p.detail ?? {};

  // Phan loai: uu tien du lieu cao tu san; khong co thi dung mau/size cua san pham
  const variants = d.variants?.length ? d.variants : [
    ...(p.colors.length ? [{ name: "Màu sắc", options: p.colors.map((slug) => ({ name: COLORS.find((x) => x.slug === slug)?.name ?? slug, image: null })) }] : []),
    ...(p.sizes.length ? [{ name: "Kích cỡ", options: p.sizes.map((x) => ({ name: x, image: null })) }] : []),
  ];
  const attrs = [
    ...(d.attributes ?? []),
    ...(!d.attributes?.some((a) => /chat lieu|chất liệu/i.test(a.label)) && p.material ? [{ label: "Chất liệu", value: p.material }] : []),
  ];
  const sourcePath = d.sourcePath?.length ? d.sourcePath.map((x) => x.name) : [p.style.name, p.category.name, ...(p.type ? [p.type.name] : [])];
  const typeHref = p.type ? `/san-pham?loai=${p.type.slug}` : `/phong-cach/${p.style.slug}/${p.category.slug}`;
  const ratingBreakdown = d.ratingBreakdown ?? null;

  const jsonLd = {
    "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description || p.name,
    image: p.images.filter((i) => !i.startsWith("data:")), category: sourcePath.join(" / "),
    offers: { "@type": "Offer", priceCurrency: "VND", price: p.price, availability: d.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", url: `${process.env.APP_URL ?? ""}/san-pham/${p.slug}` },
    ...(p.reviewCount > 0 && p.rating > 0 ? { aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviewCount } } : {}),
  };

  const card = "bg-white p-4 md:p-6";
  const h2 = "bg-[#fafafa] px-4 py-3 font-sans text-[18px] font-normal uppercase text-[#222]";

  return (
    <div className="bg-[#f5f5f5] pb-24 text-[#222] lg:pb-12">
      <ViewTracker productId={p.id} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-x">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-2 gap-y-1 py-4 text-[14px] text-[#05a]">
          <Link href="/" className="hover:opacity-80">{m.name === "Shopee" ? "Trang chủ" : "Trang chủ"}</Link>
          {sourcePath.map((n) => <span key={n} className="flex items-center gap-2 text-[#999]"><span aria-hidden>›</span><span className="text-[#05a]">{n}</span></span>)}
          <span className="flex items-center gap-2 text-[#999]"><span aria-hidden>›</span><span aria-current="page" className="line-clamp-1 text-[#222]">{p.name}</span></span>
        </nav>

        <div className="space-y-4">
          <section className={`${card} rounded-[3px] shadow-[0_1px_1px_0_rgba(0,0,0,.05)]`}>
            <ProductHero
              productId={p.id} name={p.name} images={p.images} video={d.video ?? null}
              priceText={formatVnd(p.price)} originalPriceText={p.originalPrice ? formatVnd(p.originalPrice) : null} discountPct={p.discountPct}
              rating={p.rating} ratingCountText={compactNumber(p.reviewCount)} soldText={d.soldText ? d.soldText.replace(/đã bán/i, "").trim() : compactNumber(p.sold)}
              likeText={d.likeCount != null ? compactNumber(d.likeCount) : null}
              variants={variants} stockText={d.stock != null ? `${d.stock} sản phẩm có sẵn` : null}
              shipping={d.shipping ?? null} guarantees={d.guarantees ?? []} merchantName={m.name} cta={m.cta} goHref={go} isDemo={p.isDemo} disclosure={settings.disclosure}
            />
          </section>

          {d.shop?.name && <ShopCard shop={d.shop} />}

          <section className="rounded-[3px] bg-white shadow-[0_1px_1px_0_rgba(0,0,0,.05)]">
            <h2 className={h2}>Chi tiết sản phẩm</h2>
            <dl className="space-y-3 p-4 text-[14px] md:px-6 md:py-5">
              <div className="grid grid-cols-[110px_1fr] gap-x-4 md:grid-cols-[140px_1fr]"><dt className="text-[#00000066]">Danh Mục</dt>
                <dd className="text-[#05a]">{["Trang chủ", ...sourcePath].join(" › ")}</dd></div>
              {d.stock != null && <div className="grid grid-cols-[110px_1fr] gap-x-4 md:grid-cols-[140px_1fr]"><dt className="text-[#00000066]">Kho</dt><dd>{d.stock}</dd></div>}
              {attrs.map((a) => (
                <div key={a.label} className="grid grid-cols-[110px_1fr] gap-x-4 md:grid-cols-[140px_1fr]"><dt className="text-[#00000066]">{a.label}</dt><dd className="break-words">{a.value}</dd></div>
              ))}
              {p.tags.length > 0 && <div className="grid grid-cols-[110px_1fr] gap-x-4 md:grid-cols-[140px_1fr]"><dt className="text-[#00000066]">Từ khoá</dt>
                <dd className="flex flex-wrap gap-2">{p.tags.map((t) => <span key={t} className="bg-[#f5f5f5] px-2 py-0.5 text-[12px]">#{t}</span>)}</dd></div>}
            </dl>
            <h2 className={h2}>Mô tả sản phẩm</h2>
            <div className="whitespace-pre-line break-words p-4 text-[14px] leading-[1.7] md:px-6 md:py-5">{p.description || "Chưa có mô tả."}</div>
          </section>

          <section className="cv-auto rounded-[3px] bg-white shadow-[0_1px_1px_0_rgba(0,0,0,.05)]" aria-labelledby="rv">
            <h2 id="rv" className={h2}>Đánh giá sản phẩm</h2>
            <div className="p-4 md:p-6">
              <Suspense fallback={<SectionSkeleton className="!p-0" rows={5} />}>
                <Reviews productId={p.id} rating={p.rating} reviewCount={p.reviewCount} breakdown={ratingBreakdown} />
              </Suspense>
            </div>
          </section>

          <Suspense fallback={null}>
            <Blogs productId={p.id} />
          </Suspense>

          <Suspense fallback={<div className="pt-2"><div className="mb-3 h-6" /><RelatedSkeleton /></div>}>
            <Related p={p} typeHref={typeHref} />
          </Suspense>
        </div>
      </div>
      <RecentlyViewed excludeId={p.id} />

      {/* Thanh CTA co dinh tren mobile */}
      <div className="fixed inset-x-0 bottom-0 border-t border-[#e8e8e8] bg-white p-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:hidden" style={{ zIndex: "var(--z-sticky)" }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1"><p className="truncate text-xs text-[#757575]">{p.name}</p><p className="text-[18px] font-medium text-[#ee4d2d]">{formatVnd(p.price)}</p></div>
          <a href={go} target="_blank" rel="sponsored nofollow noopener noreferrer" className="flex h-11 items-center gap-2 rounded-[2px] bg-[#ee4d2d] px-5 text-[14px] font-medium text-white">{m.cta} <ExternalLink size={14} /></a>
        </div>
      </div>
    </div>
  );
}

async function Reviews({ productId, ...rest }: { productId: number; rating: number; reviewCount: number; breakdown: ProductDetail["detail"]["ratingBreakdown"] | null }) {
  const bundle = await getContainer().catalog.reviews(productId);
  return <ReviewSection bundle={bundle} {...rest} />;
}

async function Blogs({ productId }: { productId: number }) {
  const posts = await getContainer().blogRepo.publishedByProduct(productId, 3).catch(() => []);
  if (!posts.length) return null;
  return (
    <section aria-labelledby="blg" className="cv-auto bg-white p-4 md:p-6">
      <h2 id="blg" className="mb-3 font-sans text-[16px] font-medium uppercase text-[#555]">Bài viết liên quan</h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {posts.map((b) => (
          <li key={b.id}><Link href={`/blog/${b.slug}`} className="block hover:opacity-80"><span className="block font-medium leading-snug">{b.title}</span><span className="mt-1 line-clamp-2 block text-[13px] text-[#757575]">{b.excerpt}</span></Link></li>
        ))}
      </ul>
    </section>
  );
}

async function Related({ p, typeHref }: { p: ProductDetail; typeHref: string }) {
  const related = await getContainer().catalog.related(p, 12);
  if (!related.length) return null;
  return (
    <section aria-labelledby="rel" className="cv-auto pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="rel" className="font-sans text-[16px] font-medium uppercase text-[#555]">Sản phẩm cùng loại{p.type ? `: ${p.type.name}` : ""}</h2>
        <Link href={typeHref} className="text-[14px] text-[#ee4d2d] hover:opacity-80">Xem tất cả ›</Link>
      </div>
      <RelatedGrid items={related} />
    </section>
  );
}
