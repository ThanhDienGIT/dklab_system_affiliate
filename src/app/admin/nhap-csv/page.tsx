import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { ImportForm } from "@/components/admin/import-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nhập / xuất sản phẩm" };

export default async function ImportPage() {
  await requirePermission("import.run", "/admin/nhap-csv");
  return (<><h1 className="mb-2 text-4xl">Nhập / xuất sản phẩm</h1><p className="mb-6 text-sm text-muted">Nhận JSON/CSV từ công cụ cào dữ liệu hoặc Shopee Affiliate; xuất lại cùng định dạng để sao lưu/so sánh.</p><ImportForm /></>);
}
