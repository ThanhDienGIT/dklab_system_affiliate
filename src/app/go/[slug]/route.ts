import { NextResponse } from "next/server";
import { getContainer } from "@/server/container";
import { clientIp } from "@/server/security/rate-limit";
import { currentUser } from "@/server/session";

export const dynamic = "force-dynamic";

/** Cong chuyen huong affiliate: ghi click roi 302 sang Shopee/TikTok (nofollow, khong index) */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const user = await currentUser().catch(() => null);
  const target = await getContainer().tracking.resolve(slug, {
    source: sp.get("src") ?? "site", referer: req.headers.get("referer"),
    userAgent: req.headers.get("user-agent") ?? "", ip: clientIp(req.headers), userId: user?.id ?? null,
  });
  if (!target) return NextResponse.redirect(new URL(`/san-pham/${slug}`, req.url), 302);
  return new NextResponse(null, {
    status: 302,
    headers: { location: target, "x-robots-tag": "noindex, nofollow", "referrer-policy": "no-referrer", "cache-control": "no-store" },
  });
}
