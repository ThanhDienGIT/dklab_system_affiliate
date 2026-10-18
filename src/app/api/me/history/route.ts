import { api, assertSameOrigin, json, requireApiUser } from "@/server/http";
import { getContainer } from "@/server/container";

/** Lich su ca nhan (dong bo nhieu thiet bi): tu khoa da tim + san pham da xem */
export const GET = api(async () => {
  const u = await requireApiUser();
  const c = getContainer();
  const [searches, viewedIds] = await Promise.all([c.analytics.userSearches(u.id, 10), c.analytics.userViewed(u.id, 20)]);
  const cards = viewedIds.length ? await c.products.byIds(viewedIds) : [];
  const order = new Map(viewedIds.map((id, i) => [id, i]));
  return json({ searches, viewed: cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) }, { headers: { "cache-control": "private, no-store" } });
});

/** ?type=search | view | all — xoa lich su ca nhan (so lieu thong ke tong van giu, da an danh) */
export const DELETE = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireApiUser();
  const type = new URL(req.url).searchParams.get("type") ?? "all";
  const a = getContainer().analytics;
  if (type === "search" || type === "all") await a.clearUserSearches(u.id);
  if (type === "view" || type === "all") await a.clearUserViewed(u.id);
  return json({ ok: true });
});
