import type { Metadata } from "next";
import { Breadcrumb } from "@/components/ui/section";
import { PageTitle } from "@/components/ui/page-title";
import { CatalogView } from "@/components/catalog/catalog-view";
import { parseCatalogParams, type RawParams } from "@/lib/catalog-params";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mới về", description: "Những món vừa cập nhật tại Éleonore." };

export default async function Page({ searchParams }: { searchParams: Promise<RawParams> }) {
  const state = parseCatalogParams(await searchParams, "newest");
  return (
    <>
      <Breadcrumb items={[{ label: "Trang chủ", href: "/" }, { label: "Mới về" }]} />
      <PageTitle title="Mới về" sub="Những món vừa cập nhật" />
      <CatalogView path="/moi-ve" state={state} base={{ isNew: true }} defaultSort="newest" />
    </>
  );
}
