import type { Metadata } from "next";
import type { ReactNode } from "react";
import Image from "next/image";
import { requirePermission } from "@/server/session";
import { can } from "@/server/security/rbac";
import { getContainer } from "@/server/container";
import { AdminNav } from "@/components/admin/admin-nav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Quản trị", template: "%s | Quản trị" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requirePermission("analytics.read");
  const settings = await getContainer().catalog.settings();
  const items = [
    { href: "/admin", label: "Tổng quan" },
    { href: "/admin/thong-ke", label: "Thống kê" },
    { href: "/admin/san-pham", label: "Sản phẩm" },
    { href: "/admin/blog", label: "Blog" },
    { href: "/admin/phan-loai", label: "Phân loại" },
    { href: "/admin/nhap-shopee", label: "Nhập Shopee" },
    { href: "/admin/nhap-du-lieu", label: "Nhập dữ liệu" },
    ...(can(user.role, "user.manage") ? [{ href: "/admin/nguoi-dung", label: "Người dùng" }] : []),
    ...(can(user.role, "settings.write") ? [{ href: "/admin/ai", label: "Cấu hình AI" }, { href: "/admin/cai-dat", label: "Cài đặt" }] : []),
  ];
  return (
    <div className="container-x pb-4 pt-6">
      {/* Anh bia = banner thuong hieu, avatar = anh nguoi dung (mac dinh admin: anh nguoi mau) */}
      <div className="relative">
        <div className="relative aspect-[2056/765] max-h-[260px] min-h-[130px] w-full overflow-hidden bg-sand">
          {settings.hero.image.startsWith("data:")
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={settings.hero.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
            : <Image src={settings.hero.image} alt="" fill priority sizes="(min-width:1440px) 1344px, 100vw" className="object-cover" />}
        </div>
        <div className="relative -mt-12 flex items-end gap-4 px-4 md:-mt-16 md:px-8">
          {user.avatarUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={user.avatarUrl} alt={`Ảnh đại diện ${user.fullName}`} className="h-24 w-24 shrink-0 rounded-full border-4 border-ivory object-cover shadow-md md:h-32 md:w-32" />
            : <div className="font-display grid h-24 w-24 shrink-0 place-items-center rounded-full border-4 border-ivory bg-ink text-4xl text-ivory md:h-32 md:w-32">{user.fullName.slice(0, 1)}</div>}
          <div className="pb-2">
            <p className="font-display text-2xl leading-tight md:text-3xl">{user.fullName}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-gold-deep">{user.role === "admin" ? "Quản trị viên" : "Biên tập viên"}</p>
          </div>
        </div>
      </div>
      <div className="mt-6"><AdminNav items={items} /></div>
      <div className="pt-8">{children}</div>
    </div>
  );
}
