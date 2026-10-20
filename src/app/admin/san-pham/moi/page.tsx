import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thêm sản phẩm" };

export default async function NewProduct() {
  await requirePermission("product.write", "/admin/san-pham/moi");
  const taxonomy = await getContainer().catalog.taxonomy();
  return (<><PageHeader title="Thêm sản phẩm" crumbs={[{ label: "Sản phẩm", href: "/admin/san-pham" }, { label: "Thêm sản phẩm" }]} /><ProductForm taxonomy={taxonomy} /></>);
}
