import { api, assertSameOrigin, json, readJson } from "@/server/http";
import { getContainer } from "@/server/container";
import { AppError } from "@/server/domain/errors";
import { env } from "@/server/config/env";
import { enforceRate, limit, requestMeta } from "@/server/security/rate-limit";
import { setAuthCookies } from "@/server/session";
import { toProfile } from "@/server/services/profile.service";

/** Bot thuong dien moi o va gui ngay: honeypot "website" phai rong, form phai mo >= 1.2 giay (do bang JS => bot khong chay JS cung bi chan) */
const MIN_FILL_MS = 1200;

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("register", 5, 10 * 60_000);
  await enforceRate("register-day", 20, 24 * 3_600_000);
  const body = (await readJson(req)) as { favorites?: number[]; website?: unknown; elapsedMs?: unknown };
  if (body.website || typeof body.elapsedMs !== "number" || body.elapsedMs < MIN_FILL_MS) {
    throw new AppError("VALIDATION", "Không thể đăng ký lúc này, vui lòng thử lại.");
  }
  const meta = await requestMeta();
  const c = getContainer();
  const t = await c.auth.register(body, meta);
  const mustVerify = env().REQUIRE_VERIFIED_EMAIL === "true" && !t.user.emailVerified;
  if (mustVerify) return json({ needsVerification: true, mailSent: t.mailSent === true }, 201); // chua cap phien dang nhap
  await setAuthCookies(t.access, t.refresh, t.refreshExpiresAt);
  if (Array.isArray(body.favorites)) await c.auth.mergeFavorites(t.user.id, body.favorites.filter((n) => Number.isInteger(n)));
  return json({ user: toProfile(t.user, []), mailSent: t.mailSent === true }, 201);
});
