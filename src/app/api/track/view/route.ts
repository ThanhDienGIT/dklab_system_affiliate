import { z } from "zod";
import { api, assertSameOrigin } from "@/server/http";
import { getContainer } from "@/server/container";
import { clientIp, limit } from "@/server/security/rate-limit";
import { currentUser } from "@/server/session";

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pagespeed|curl|wget|python/i;
const body = z.object({ productId: z.number().int().positive(), fromSearch: z.boolean().optional() });

/**
 * Ghi 1 luot xem trang chi tiet. Goi bang navigator.sendBeacon sau khi trang hien -> khong chan render.
 * Loc bot, gioi han 60 luot/phut/IP, loi ghi bi nuot (thong ke khong duoc lam hong trai nghiem).
 */
export const POST = api(async (req: Request) => {
  const none = new Response(null, { status: 204 });
  assertSameOrigin(req);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return none;
  if (!(await limit(`view:${clientIp(req.headers)}`, 60, 60_000)).ok) return none;
  let parsed: z.infer<typeof body>;
  try { parsed = body.parse(JSON.parse(await req.text())); } catch { return none; }
  const user = await currentUser().catch(() => null);
  await getContainer().analytics.recordView({
    productId: parsed.productId, userId: user?.id ?? null, fromSearch: parsed.fromSearch === true, mobile: /mobile|android|iphone|ipad/i.test(ua),
  }).catch(() => { /* san pham da xoa (FK) hoac DB ban: bo qua */ });
  return none;
});
