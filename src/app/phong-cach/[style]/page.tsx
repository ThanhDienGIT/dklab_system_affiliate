import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/server/container";
import { Breadcrumb, Section, SectionHead } from "@/components/ui/section";
import { Reveal, RevealGroup, RevealItem } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";
import { ProductGrid } from "@/components/product/product-grid";
import { StyleTree } from "@/components/catalog/style-tree";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ style: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { style } = await params;
  const page = await getContainer().catalog.stylePage(style);
  if (!page) return {};
  return { title: `Phong cách ${page.style.name}`, description: page.style.tagline + ". " + page.style.intro.slice(0, 120), openGraph: { images: page.style.heroImage ? [page.style.heroImage] : undefined } };
}

/** Tang 2: gioi thieu phong cach -> bang mau -> hinh anh mood -> the loai */
export default async function StylePage({ params }: Props) {
  const { style: slug } = await params;
  const c = getContainer();
  const [page, menu] = await Promise.all([c.catalog.stylePage(slug), c.catalog.menu()]);
  if (!page) notFound();
  const { style } = page;
  const cats = menu.find((m) => m.slug === slug)?.children ?? [];

  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Phong cách" }, { label: style.name }]} />
      <section className="container-x grid gap-8 pt-6 lg:grid-cols-[250px_1fr] xl:grid-cols-[270px_1fr]">
        <div className="hidden lg:block"><StyleTree menu={menu} style={slug} /></div>
        <div>
          <div className="relative overflow-hidden bg-sand">
            <div className="relative aspect-[16/10] md:aspect-[21/9]">
              <SmartImage src={style.heroImage} alt={`Phong cách ${style.name}`} priority sizes="(min-width:1024px) 70vw, 100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-ivory md:p-10">
                <p className="eyebrow !text-gold-soft">Phong cách</p>
                <h1 className="mt-2 text-5xl md:text-7xl">{style.name}</h1>
                <p className="mt-2 max-w-xl text-sm text-ivory/85 md:text-base">{style.tagline}</p>
              </div>
            </div>
          </div>

          <Reveal className="mt-10 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 className="text-2xl md:text-3xl">Giới thiệu</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{style.intro}</p>
              <h3 className="mt-6 text-lg font-sans font-semibold">Món đồ đặc trưng</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {style.signatureItems.map((s) => <li key={s} className="border border-line bg-paper px-3 py-1.5 text-sm">{s}</li>)}
              </ul>
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl">Bảng màu</h2>
              <ul className="mt-4 grid grid-cols-3 gap-3">
                {style.palette.map((p) => (
                  <li key={p.hex}>
                    <span className="block aspect-square border border-ink/10" style={{ background: p.hex }} />
                    <span className="mt-1.5 block text-xs font-medium">{p.name}</span>
                    <span className="block text-[11px] uppercase text-muted">{p.hex}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {style.moodImages.length > 0 && (
            <RevealGroup className="mt-10 grid grid-cols-3 gap-2 md:gap-4">
              {style.moodImages.slice(0, 3).map((src, i) => (
                <RevealItem key={src} className="relative aspect-[3/4] overflow-hidden bg-sand">
                  <SmartImage src={src} alt={`Mood ${style.name} ${i + 1}`} sizes="(min-width:1024px) 22vw, 33vw" />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>

      <Section>
        <SectionHead eyebrow={`${page.total} sản phẩm`} title={`Mua sắm ${style.name} theo thể loại`} />
        <RevealGroup className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-6">
          {cats.map((cat) => {
            const sec = page.sections.find((s) => s.category.slug === cat.slug);
            return (
              <RevealItem key={cat.slug}>
                <Link href={cat.href} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-sand">
                    <SmartImage src={sec?.items[0]?.image ?? style.moodImages[0]} alt={cat.name} sizes="(min-width:1280px) 16vw, 33vw" className="transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <p className="mt-3 text-center text-[12px] font-semibold uppercase tracking-[0.16em] group-hover:text-gold-deep">{cat.name}</p>
                  <p className="text-center text-xs text-muted">{sec?.total ?? 0} sản phẩm</p>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </Section>

      {page.sections.map((sec) => (
        <Section key={sec.category.slug}>
          <SectionHead title={sec.category.name} href={`/phong-cach/${slug}/${sec.category.slug}`} linkLabel={`Xem ${sec.total} sản phẩm`} />
          <ProductGrid items={sec.items} cols={4} showStyle={false} />
        </Section>
      ))}
    </>
  );
}
