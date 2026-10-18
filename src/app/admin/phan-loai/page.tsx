import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Phân loại" };

export default async function TaxonomyPage() {
  await requirePermission("taxonomy.read", "/admin/phan-loai");
  const taxonomy = await getContainer().taxonomy.getAll(true);
  return (<><h1 className="mb-6 text-4xl">Phân loại & menu</h1><TaxonomyManager taxonomy={taxonomy} /></>);
}
