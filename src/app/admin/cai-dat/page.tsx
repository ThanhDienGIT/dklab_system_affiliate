import type { Metadata } from "next";
import { requirePermission } from "@/server/session";
import { getContainer } from "@/server/container";
import { SettingsForm } from "@/components/admin/settings-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cài đặt" };

export default async function SettingsPage() {
  await requirePermission("settings.write", "/admin/cai-dat");
  const settings = await getContainer().catalog.settings();
  return (<><h1 className="mb-6 text-4xl">Cài đặt cửa hàng</h1><SettingsForm settings={settings} /></>);
}
