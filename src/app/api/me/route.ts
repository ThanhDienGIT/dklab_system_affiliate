import { api, assertSameOrigin, json, readJson, requireApiUser } from "@/server/http";
import { currentUser } from "@/server/session";
import { getContainer } from "@/server/container";
import { requestMeta } from "@/server/security/rate-limit";

export const GET = api(async () => {
  const u = await currentUser();
  if (!u) return json({ user: null });
  return json({ user: await getContainer().profile.get(u.id) });
});

export const PUT = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireApiUser();
  const body = (await readJson(req)) as Record<string, unknown> & { clearCccd?: boolean };
  const { ipHash } = await requestMeta();
  return json({ user: await getContainer().profile.update(u.id, body, { clearCccd: body.clearCccd === true, ipHash }) });
});

export const PATCH = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requireApiUser();
  await getContainer().auth.changePassword(u.id, await readJson(req), await requestMeta());
  return json({ ok: true });
});
