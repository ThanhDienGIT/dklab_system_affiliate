import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requirePermission } from "@/server/session";
import { can } from "@/server/security/rbac";
import { getContainer } from "@/server/container";
import { AdminShell, type AdminNavGroup } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Quản trị", template: "%s | Quản trị" }, robots: { index: false, follow: false } };

const only = (ok: boolean, items: AdminNavGroup["items"]) => (ok ? items : []);

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("analytics.read");
  const settings = await getContainer().catalog.settings();
  const all: AdminNavGroup[] = [
    { label: "Tổng quan", items: [{ href: "/admin", label: "Bảng điều khiển", icon: "dashboard" }, { href: "/admin/thong-ke", label: "Thống kê", icon: "stats" }] },
    {
      label: "Cửa hàng", items: [
        { href: "/admin/san-pham", label: "Sản phẩm", icon: "products" },
        { href: "/admin/san-pham/moi", label: "Thêm sản phẩm", icon: "add" },
        { href: "/admin/phan-loai", label: "Phân loại & menu", icon: "taxonomy" },
      ],
    },
    { label: "Nội dung", items: [{ href: "/admin/blog", label: "Blog", icon: "blog" }] },
    {
      label: "Dữ liệu", items: [
        { href: "/admin/nhap-shopee", label: "Nhập Shopee", icon: "shopee" },
        { href: "/admin/nhap-du-lieu", label: "Nhập / xuất dữ liệu", icon: "import" },
      ],
    },
    {
      label: "Hệ thống", items: [
        ...only(can(user.role, "user.manage"), [{ href: "/admin/nguoi-dung", label: "Người dùng", icon: "users" }]),
        ...only(can(user.role, "settings.write"), [{ href: "/admin/ai", label: "Cấu hình AI", icon: "ai" }, { href: "/admin/cai-dat", label: "Cài đặt", icon: "settings" }]),
      ],
    },
  ];
  const groups = all.filter((g) => g.items.length > 0);
  return (
    <AdminShell groups={groups} brand={settings.brand.name}
      user={{ fullName: user.fullName, email: user.email, avatarUrl: user.avatarUrl, role: user.role }}>
      {children}
    </AdminShell>
  );
}
