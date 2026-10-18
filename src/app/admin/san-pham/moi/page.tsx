import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thêm sản phẩm" };

export default async function NewProduct() {
  await requirePermission("product.write", "/admin/san-pham/moi");
  const taxonomy = await getContainer().catalog.taxonomy();
  return (<><h1 className="mb-6 text-4xl">Thêm sản phẩm</h1><ProductForm taxonomy={taxonomy} /></>);
}
