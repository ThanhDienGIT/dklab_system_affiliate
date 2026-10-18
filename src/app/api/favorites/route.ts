import { api, assertSameOrigin, json, readJson, requireApiUser } from "@/server/http";
import { currentUser } from "@/server/session";
import { getContainer } from "@/server/container";
import { enforceRate } from "@/server/security/rate-limit";

export const GET = api(async () => {
  const u = await currentUser();
  return json({ ids: u ? await getContainer().favorites.ids(u.id) : [], authed: Boolean(u) });
});

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("fav", 120, 60_000);
  const u = await requireApiUser();
  const b = (await readJson(req)) as { productId?: number; on?: boolean };
  if (!Number.isInteger(b.productId)) return json({ error: { code: "VALIDATION", message: "Thiếu productId" } }, 400);
  const c = getContainer();
  if (b.on) await c.favorites.add(u.id, b.productId!); else await c.favorites.remove(u.id, b.productId!);
  return json({ ids: await c.favorites.ids(u.id) });
});
