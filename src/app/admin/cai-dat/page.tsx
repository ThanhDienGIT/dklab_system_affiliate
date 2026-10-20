import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { SettingsForm } from "@/components/admin/settings-form";
import { PageHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  await requirePermission("settings.write", "/admin/cai-dat");
  const settings = await getContainer().catalog.settings();
  return (<><PageHeader title="Cài đặt cửa hàng" crumbs={[{ label: "Hệ thống" }, { label: "Cài đặt" }]} /><SettingsForm settings={settings} /></>);
}
