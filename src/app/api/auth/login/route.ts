import { api, assertSameOrigin, json, readJson } from "@/server/http";
import { getContainer } from "@/server/container";
import { enforceRate, requestMeta } from "@/server/security/rate-limit";
import { setAuthCookies } from "@/server/session";

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("login", 10, 10 * 60_000);
  const body = (await readJson(req)) as { favorites?: number[] };
  const c = getContainer();
  const t = await c.auth.login(body, await requestMeta());
  await setAuthCookies(t.access, t.refresh, t.refreshExpiresAt);
  if (Array.isArray(body.favorites)) await c.auth.mergeFavorites(t.user.id, body.favorites.filter((n) => Number.isInteger(n)));
  return json({ ok: true, role: t.user.role });
});
