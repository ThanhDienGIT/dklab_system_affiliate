import { api, assertSameOrigin, json, readJson } from "@/server/http";
import { getContainer } from "@/server/container";
import { enforceRate } from "@/server/security/rate-limit";
import { newsletterSchema } from "@/server/domain/validators";
import { validation } from "@/server/services/auth.service";

export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("newsletter", 5, 10 * 60_000);
  const parsed = newsletterSchema.safeParse(await readJson(req));
  if (!parsed.success) throw validation(parsed.error.issues);
  if (parsed.data.hp) return json({ ok: true }); // honeypot: bot dien o an
  await getContainer().misc.subscribe(parsed.data.email, "site");
  return json({ ok: true });
});
