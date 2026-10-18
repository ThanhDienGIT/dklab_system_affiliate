import Link from "next/link";
import { getContainer } from "@/server/container";
import { currentUser } from "@/server/session";
import { Hero } from "@/components/home/hero";
import { StyleTiles } from "@/components/home/style-tiles";
import { Marquee } from "@/components/home/marquee";
import { Section, SectionHead } from "@/components/ui/section";
import { ProductRow } from "@/components/product/product-row";
import { ProductGrid } from "@/components/product/product-grid";
import { RecentlyViewed } from "@/components/product/recently-viewed";
import { Reveal } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const c = getContainer();
  const user = await currentUser();
  const [home, settings, taxo, rec] = await Promise.all([
    c.catalog.home(), c.catalog.settings(), c.catalog.taxonomy(), user ? c.recommend.forUser(user.id, 8) : Promise.resolve(null),
  ]);
  // Style noi bat trong tuan: xoay vong theo tuan de trang chu luon moi
  const week = Math.floor(Date.now() / (7 * 864e5));
  const spot = taxo.styles[week % Math.max(1, taxo.styles.length)];
  const words = taxo.styles.flatMap((s) => s.signatureItems).slice(0, 14);

  return (
    <>
      <Hero hero={settings.hero} />

      <Section className="!pt-4">
        <SectionHead eyebrow="Shop theo phong cách" title="Chọn thế giới của bạn" />
        <StyleTiles styles={home.styles} />
      </Section>

      <Section>
        <SectionHead eyebrow="Vừa cập nhật" title="New Arrival" href="/moi-ve" />
        <ProductRow items={home.newArrivals} />
      </Section>

      <Section>
        {rec && rec.basedOn.length > 0 ? (
          <>
            <SectionHead eyebrow={`Dành cho bạn · ${rec.basedOn.map((s) => s.name).join(", ")}`} title="Gợi ý theo phong cách của bạn" href="/tai-khoan#phong-cach" linkLabel="Chỉnh sở thích" />
            <ProductGrid items={rec.items} cols={4} />
          </>
        ) : (
          <Reveal className="grid items-center gap-6 bg-sand px-6 py-12 text-center md:px-16">
            <p className="eyebrow">Cá nhân hoá</p>
            <h2 className="section-title">{user ? "Chọn phong cách bạn yêu thích" : "Tạo tài khoản để nhận gợi ý riêng"}</h2>
            <p className="mx-auto max-w-xl text-sm text-ink-soft">Chọn các phong cách bạn thích và ngân sách, Éleonore sẽ ưu tiên những sản phẩm phù hợp ngay trên trang chủ.</p>
            <div><Link href={user ? "/tai-khoan#phong-cach" : "/dang-ky"} className="btn btn-solid">{user ? "Chọn phong cách" : "Bắt đầu"}</Link></div>
          </Reveal>
        )}
      </Section>

      <Section>
        <SectionHead eyebrow="Được yêu thích" title="Best Seller" href="/ban-chay" />
        <ProductGrid items={home.bestSellers.slice(0, 8)} cols={4} />
      </Section>

      <Section>
        <SectionHead eyebrow="Mùa này" title="Season Highlights" />
        {spot && (
          <Reveal className="grid overflow-hidden bg-paper md:grid-cols-2">
            <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[420px]">
              <SmartImage src={spot.heroImage} alt={`Phong cách ${spot.name}`} sizes="(min-width:768px) 50vw, 100vw" />
            </div>
            <div className="flex flex-col justify-center gap-4 p-8 md:p-14">
              <p className="eyebrow">Phong cách của tuần</p>
              <h3 className="text-4xl md:text-5xl">{spot.name}</h3>
              <p className="text-sm italic text-gold-deep">{spot.tagline}</p>
              <p className="text-[15px] text-ink-soft">{spot.intro}</p>
              <ul className="flex gap-2" aria-label="Bảng màu">
                {spot.palette.map((p) => <li key={p.hex} title={p.name} className="h-7 w-7 rounded-full border border-ink/10" style={{ background: p.hex }} />)}
              </ul>
              <div><Link href={`/phong-cach/${spot.slug}`} className="btn btn-ghost">Khám phá {spot.name}</Link></div>
            </div>
          </Reveal>
        )}
        {home.onSale.length > 0 && (
          <div className="mt-12">
            <h3 className="mb-6 text-center font-display text-3xl">Đang giảm giá</h3>
            <ProductGrid items={home.onSale} cols={5} />
          </div>
        )}
      </Section>

      <RecentlyViewed />

      <Marquee words={words} />
    </>
  );
}
