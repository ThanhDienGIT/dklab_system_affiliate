import { api, json, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { enforceRate, requestMeta } from "@/server/security/rate-limit";

/** Xem CCCD day du: chi admin, gioi han toc do, luon ghi audit log */
export const POST = api(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const actor = await requirePermissionApi("pii.reveal");
  await enforceRate("reveal", 20, 10 * 60_000);
  const cccd = await getContainer().profile.revealCccd(actor, (await ctx.params).id, (await requestMeta()).ipHash);
  return json({ cccd }, { headers: { "cache-control": "no-store" } });
});
