import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getContainer } from "@/server/container";
import { googleProvider } from "@/server/security/google";
import { requestMeta } from "@/server/security/rate-limit";
import { appUrl, safeNext, setAuthCookies } from "@/server/session";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const c = await cookies();
  const state = c.get("el_g_state")?.value, verifier = c.get("el_g_verifier")?.value;
  const nonce = c.get("el_g_nonce")?.value, next = safeNext(c.get("el_g_next")?.value, "/");
  for (const k of ["el_g_state", "el_g_verifier", "el_g_nonce", "el_g_next"]) c.delete({ name: k, path: "/api/auth/google" });
  const fail = (code: string) => NextResponse.redirect(new URL(`/dang-nhap?error=${code}`, appUrl()));

  const code = u.searchParams.get("code");
  if (u.searchParams.get("error") || !code) return fail("google_cancel");
  if (!state || state !== u.searchParams.get("state") || !verifier || !nonce) return fail("google_state");
  try {
    const id = await googleProvider.finish(code, verifier, nonce);
    const t = await getContainer().auth.loginWithIdentity(id, await requestMeta());
    await setAuthCookies(t.access, t.refresh, t.refreshExpiresAt);
    return NextResponse.redirect(new URL(next, appUrl()));
  } catch {
    return fail("google_fail");
  }
}
