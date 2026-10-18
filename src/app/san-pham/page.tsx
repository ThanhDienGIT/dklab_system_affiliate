import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tất cả sản phẩm", description: "Toàn bộ sản phẩm tại Éleonore." };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  const state = parseCatalogParams(await searchParams, "popular");
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Tất cả sản phẩm" }]} />
      <PageTitle title="Tất cả sản phẩm" sub="Toàn bộ sản phẩm" />
      <CatalogView path="/san-pham" state={state} base={{}} defaultSort="popular" />
    </>
  );
}
