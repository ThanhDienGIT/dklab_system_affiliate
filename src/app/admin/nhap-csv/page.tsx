import { redirect } from "next/navigation";

/** Duong dan cu: da tach thanh /admin/nhap-shopee va /admin/nhap-du-lieu */
export default function LegacyImportPage() {
  redirect("/admin/nhap-du-lieu");
}
