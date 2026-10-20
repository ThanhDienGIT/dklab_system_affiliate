import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { AiConfigForm } from "@/components/admin/ai-config-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cấu hình AI" };

export default async function AiPage() {
  await requirePermission("settings.write", "/admin/ai");
  return (
    <>
      <PageHeader title="Cấu hình AI (Gemini)" crumbs={[{ label: "Hệ thống" }, { label: "Cấu hình AI" }]}
        description="Mỗi lần mở trang này hệ thống kiểm tra API key và lấy danh sách model trực tiếp từ Gemini API. Model bạn chọn áp dụng cho toàn bộ tính năng AI; có thể đặt model riêng cho từng chức năng." />
      <AiConfigForm />
    </>
  );
}
