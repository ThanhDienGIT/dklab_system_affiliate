import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { ShopeeImportForm } from "@/components/admin/import-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nhập từ Shopee Affiliate" };

export default async function ShopeeImportPage() {
  await requirePermission("import.run", "/admin/nhap-shopee");
  const t = await getContainer().taxonomy.getAll(false);
  return (
    <>
      <h1 className="mb-2 text-4xl">Nhập từ Shopee Affiliate</h1>
      <p className="mb-6 text-sm text-muted">Nhập file “Lấy link sản phẩm hàng loạt” của Shopee Affiliate, hoặc chuyển nó thành template chuẩn để chạy tool cào.</p>
      <ShopeeImportForm styles={t.styles.map((s) => ({ id: s.id, name: s.name }))} categories={t.categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
