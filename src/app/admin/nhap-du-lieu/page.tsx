import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { DataImportForm } from "@/components/admin/import-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nhập dữ liệu tool" };

export default async function DataImportPage() {
  await requirePermission("import.run", "/admin/nhap-du-lieu");
  const t = await getContainer().taxonomy.getAll(false);
  return (
    <>
      <PageHeader title="Nhập dữ liệu tool / template chuẩn" crumbs={[{ label: "Dữ liệu" }, { label: "Nhập / xuất dữ liệu" }]}
        description="Tải template chuẩn, điền hoặc cho tool cào dữ liệu, rồi nhập lại. Cũng dùng để sao lưu / chuyển dữ liệu giữa các hệ thống." />
      <DataImportForm counts={{ styles: t.styles.length, categories: t.categories.length, types: t.types.length }} />
    </>
  );
}
