import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { googleEnabled, isProd } from "@/server/config/env";
import { googleProvider } from "@/server/security/google";
import { appUrl, safeNext } from "@/server/session";

const opts = () => ({ httpOnly: true, sameSite: "lax" as const, secure: isProd() && appUrl().startsWith("https"), path: "/api/auth/google", maxAge: 600 });

export async function GET(req: Request) {
  if (!googleEnabled()) return NextResponse.redirect(new URL("/dang-nhap?error=google_off", appUrl()));
  const next = safeNext(new URL(req.url).searchParams.get("next"), "/");
  const { url, state, verifier, nonce } = googleProvider.start();
  const c = await cookies();
  c.set("el_g_state", state, opts());
  c.set("el_g_verifier", verifier, opts());
  c.set("el_g_nonce", nonce, opts());
  c.set("el_g_next", next, opts());
  return NextResponse.redirect(url);
}
