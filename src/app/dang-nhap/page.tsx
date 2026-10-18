import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/server/config/env";
import { currentUser, safeNext } from "@/server/session";
import { PageTitle } from "@/components/ui/page-title";
import { AuthForm } from "@/components/account/auth-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/");
  if (await currentUser()) redirect(next);
  return (
    <>
      <PageTitle eyebrow="Éleonore" title="Đăng nhập" sub="Chào mừng trở lại Éleonore." />
      <div className="container-x pb-4 pt-10"><AuthForm mode="login" next={next} googleOn={googleEnabled()} initialError={sp.error} /></div>
    </>
  );
}
