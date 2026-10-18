import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContainer } from "@/server/container";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ style: string; category: string }>; searchParams: Promise<RawParams> };

async function resolve(styleSlug: string, categorySlug: string) {
  const t = await getContainer().catalog.taxonomy();
  const style = t.styles.find((s) => s.slug === styleSlug);
  const category = t.categories.find((c) => c.slug === categorySlug);
  return style && category ? { style, category } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params;
  const r = await resolve(p.style, p.category);
  if (!r) return {};
  return { title: `${r.category.name} ${r.style.name}`, description: `${r.category.name} phong cách ${r.style.name}: lọc theo loại, màu, giá. Mua qua Shopee.` };
}

/** Tang 3: danh sach san pham + bo loc (loai, mau, khoang gia) + nut Xem tren Shopee o trang chi tiet */
export default async function CategoryPage({ params, searchParams }: Props) {
  const p = await params;
  const r = await resolve(p.style, p.category);
  if (!r) notFound();
  const state = parseCatalogParams(await searchParams);
  const path = `/phong-cach/${p.style}/${p.category}`;
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: r.style.name, href: `/phong-cach/${p.style}` }, { label: r.category.name }]} />
      <PageTitle eyebrow={r.style.name} title={r.category.name} sub={r.style.tagline} />
      <CatalogView path={path} state={state} base={{ styleSlug: p.style, categorySlug: p.category }} styleSlug={p.style} categorySlug={p.category} lockStyle lockCategory />
    </>
  );
}
