import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { getContainer } from "@/server/container";
import { PageTitle } from "@/components/ui/page-title";
import { ResendVerification } from "@/components/account/resend-verification";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Xác thực email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const token = (await searchParams).token ?? "";
  const status = token ? await getContainer().verification.confirm(token).catch(() => "invalid" as const) : "invalid";
  const ok = status === "ok" || status === "already";
  return (
    <>
      <PageTitle eyebrow="Tài khoản" title="Xác thực email" sub="" />
      <div className="container-x mx-auto max-w-lg py-10 text-center">
        {ok ? <CheckCircle2 className="mx-auto text-ok" size={48} /> : <XCircle className="mx-auto text-rose" size={48} />}
        <p className="mt-4 text-xl">
          {status === "ok" && "Email của bạn đã được xác thực."}
          {status === "already" && "Email này đã được xác thực trước đó."}
          {status === "expired" && "Liên kết đã hết hạn (hiệu lực 24 giờ)."}
          {status === "invalid" && "Liên kết không hợp lệ hoặc đã bị thay đổi."}
        </p>
        {ok ? <Link href="/tai-khoan" className="btn btn-solid mt-8 inline-flex">Về tài khoản</Link> : <div className="mt-8"><ResendVerification /></div>}
      </div>
    </>
  );
}
