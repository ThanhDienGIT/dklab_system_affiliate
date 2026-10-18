import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Bán chạy", description: "Được chọn nhiều nhất tại Éleonore." };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  const state = parseCatalogParams(await searchParams, "bestseller");
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Bán chạy" }]} />
      <PageTitle title="Bán chạy" sub="Được chọn nhiều nhất" />
      <CatalogView path="/ban-chay" state={state} base={{}} defaultSort="bestseller" />
    </>
  );
}
