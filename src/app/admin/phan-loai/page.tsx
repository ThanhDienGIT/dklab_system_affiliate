import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Phân loại" };

export default async function TaxonomyPage() {
  await requirePermission("taxonomy.read", "/admin/phan-loai");
  const taxonomy = await getContainer().taxonomy.getAll(true);
  return (<><PageHeader title="Phân loại & menu" crumbs={[{ label: "Cửa hàng" }, { label: "Phân loại & menu" }]} /><TaxonomyManager taxonomy={taxonomy} /></>);
}
