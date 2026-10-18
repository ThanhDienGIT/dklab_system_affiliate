import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { AiConfigForm } from "@/components/admin/ai-config-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cấu hình AI" };

export default async function AiPage() {
  await requirePermission("settings.write", "/admin/ai");
  return (
    <>
      <h1 className="mb-2 text-4xl">Cấu hình AI (Gemini)</h1>
      <p className="mb-6 max-w-2xl text-sm text-muted">Mỗi lần mở trang này hệ thống kiểm tra API key và lấy danh sách model trực tiếp từ Gemini API. Model bạn chọn áp dụng cho toàn bộ tính năng AI; có thể đặt model riêng cho từng chức năng.</p>
      <AiConfigForm />
    </>
  );
}
