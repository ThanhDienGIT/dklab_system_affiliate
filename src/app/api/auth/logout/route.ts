import { api, assertSameOrigin, json } from "@/server/http";
import { getContainer } from "@/server/container";
import { clearAuthCookies, readRefreshToken } from "@/server/session";

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await getContainer().auth.logout(await readRefreshToken());
  await clearAuthCookies();
  return json({ ok: true });
});
