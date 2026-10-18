import { NextResponse } from "next/server";
import { AppError } from "@/server/domain/errors";
import { api, assertSameOrigin, json } from "@/server/http";
import { getContainer } from "@/server/container";
import { requestMeta } from "@/server/security/rate-limit";
import { clearAuthCookies, readRefreshToken, safeNext, setAuthCookies } from "@/server/session";
import { appUrl } from "@/server/session";

/** GET: proxy chuyen den khi access token het han -> gia han roi quay lai trang cu */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"), "/");
  try {
    const t = await getContainer().auth.refresh(await readRefreshToken(), await requestMeta());
    await setAuthCookies(t.access, t.refresh, t.refreshExpiresAt);
  } catch (e) {
    // CONFLICT = request song song vua gia han xong (cookie moi da duoc cap) -> giu nguyen cookie
    if (!(e instanceof AppError && e.code === "CONFLICT")) await clearAuthCookies();
  }
  return NextResponse.redirect(new URL(next, appUrl()));
}

/** POST: client chu dong gia han */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const t = await getContainer().auth.refresh(await readRefreshToken(), await requestMeta());
  await setAuthCookies(t.access, t.refresh, t.refreshExpiresAt);
  return json({ ok: true });
});
