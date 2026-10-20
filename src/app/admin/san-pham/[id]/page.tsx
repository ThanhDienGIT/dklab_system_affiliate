import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sửa sản phẩm" };

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  await requirePermission("product.write", `/admin/san-pham/${id}`);
  if (!Number.isInteger(id)) notFound();
  const c = getContainer();
  const [product, taxonomy, reviews, raw] = await Promise.all([c.products.findById(id), c.taxonomy.getAll(true), c.products.reviewsOf(id), c.products.rawData(id)]);
  if (!product) notFound();
  return (<><PageHeader title="Sửa sản phẩm" crumbs={[{ label: "Sản phẩm", href: "/admin/san-pham" }, { label: "Sửa sản phẩm" }]} /><ProductForm product={product} taxonomy={taxonomy} extra={{ reviews, raw: (raw as Record<string, unknown> | null) ?? null }} /></>);
}
