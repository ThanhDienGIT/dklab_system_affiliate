import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/server/config/env";
import { currentUser, safeNext } from "@/server/session";
import { PageTitle } from "@/components/ui/page-title";
import { AuthForm } from "@/components/account/auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tạo tài khoản", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/");
  if (await currentUser()) redirect(next);
  return (
    <>
      <PageTitle eyebrow="Éleonore" title="Tạo tài khoản" sub="Lưu sản phẩm yêu thích và nhận gợi ý theo phong cách của bạn." />
      <div className="container-x pb-4 pt-10"><AuthForm mode="register" next={next} googleOn={googleEnabled()} initialError={sp.error} /></div>
    </>
  );
}
