import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sale", description: "Ưu đãi đang diễn ra tại Éleonore." };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  const state = parseCatalogParams(await searchParams, "discount");
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Sale" }]} />
      <PageTitle title="Sale" sub="Ưu đãi đang diễn ra" />
      <CatalogView path="/giam-gia" state={state} base={{ onSale: true }} defaultSort="discount" />
    </>
  );
}
