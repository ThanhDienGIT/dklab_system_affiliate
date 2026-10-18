import type { Metadata } from "next";
import Link from "next/link";
import { getContainer } from "@/server/container";
import { requireUser } from "@/server/session";
import { isStaff } from "@/server/security/rbac";
import { PageTitle } from "@/components/ui/page-title";
import { AvatarUploader } from "@/components/account/avatar-uploader";
import { ProfileForm } from "@/components/account/profile-form";
import { ResendVerification } from "@/components/account/resend-verification";
import { PasswordForm } from "@/components/account/password-form";
import { ProductGrid } from "@/components/product/product-grid";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tài khoản", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/tai-khoan");
  const c = getContainer();
  const [profile, taxo, rec] = await Promise.all([c.profile.get(user.id), c.catalog.taxonomy(), c.recommend.forUser(user.id, 8)]);
  return (
    <>
      <PageTitle eyebrow="Tài khoản" title={profile.fullName} sub="Quản lý thông tin cá nhân, phong cách yêu thích và bảo mật." />
      <div className="container-x grid gap-12 pb-4 pt-10 lg:grid-cols-[260px_1fr] lg:gap-16">
        <aside className="text-center lg:sticky lg:top-[132px] lg:self-start">
          <AvatarUploader url={profile.avatarUrl} name={profile.fullName} />
          <p className="mt-5 font-semibold">{profile.fullName}</p>
          <p className="text-sm text-muted">{profile.email}</p>
          {profile.emailVerified
            ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ok">✓ Đã xác thực email</p>
            : <div className="mt-1 space-y-1"><p className="text-xs font-semibold text-rose">Chưa xác thực email</p><ResendVerification loggedIn compact /></div>}
          <p className="mt-2 inline-block bg-sand px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">{profile.role}</p>
          <ul className="mt-6 space-y-1 text-sm">
            <li><Link href="/yeu-thich" className="link-u">Sản phẩm yêu thích</Link></li>
            {isStaff(profile.role) && <li><Link href="/admin" className="link-u">Khu vực quản trị</Link></li>}
          </ul>
        </aside>
        <div className="min-w-0 space-y-16">
          <ProfileForm profile={profile} styles={taxo.styles} />
          <section aria-labelledby="sec-rec">
            <h2 id="sec-rec" className="mb-2 text-3xl">Gợi ý cho bạn</h2>
            <p className="mb-6 text-sm text-muted">{rec.basedOn.length ? `Dựa trên: ${rec.basedOn.map((s) => s.name).join(", ")}${rec.budgetMax ? ` · ngân sách ≤ ${rec.budgetMax.toLocaleString("vi-VN")}₫` : ""}` : "Chọn phong cách phía trên để nhận gợi ý riêng. Hiện hiển thị sản phẩm bán chạy."}</p>
            <ProductGrid items={rec.items} cols={4} />
          </section>
          <section aria-labelledby="sec-pw">
            <h2 id="sec-pw" className="mb-6 text-3xl">Bảo mật</h2>
            <PasswordForm hasPassword={profile.hasPassword} />
          </section>
        </div>
      </div>
    </>
  );
}
