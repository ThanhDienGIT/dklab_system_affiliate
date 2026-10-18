import { z } from "zod";
import { api, assertSameOrigin, bustCatalog, json, readJson, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";
import { validation } from "@/server/services/auth.service";

const str = (n: number) => z.string().trim().max(n);
const url = z.string().trim().max(500).refine((v) => v === "" || /^(https?:\/\/|\/)/.test(v), "Đường dẫn không hợp lệ");
const SCHEMAS = {
  brand: z.object({ name: str(60).min(1), tagline: str(160) }),
  announcement: z.object({ text: str(200), href: url }),
  hero: z.object({ image: url, eyebrow: str(60), title: str(80), subtitle: str(240), ctaLabel: str(40), ctaHref: url }),
  contact: z.object({ hotline: str(30), email: str(120), zalo: url, messenger: url, address: str(200) }),
  social: z.object({ instagram: url, tiktok: url, facebook: url }),
  popup: z.object({ enabled: z.boolean(), delaySec: z.number().int().min(3).max(120), title: str(80), body: str(300) }),
  disclosure: str(600),
} as const;

export const PUT = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("settings.write");
  const b = (await readJson(req)) as { key?: keyof typeof SCHEMAS; value?: unknown };
  if (!b.key || !(b.key in SCHEMAS)) throw new AppError("VALIDATION", "Mục cấu hình không hợp lệ");
  const parsed = SCHEMAS[b.key].safeParse(b.value);
  if (!parsed.success) throw validation(parsed.error.issues);
  await getContainer().settings.set(b.key, parsed.data);
  await getContainer().misc.audit({ actorId: u.id, action: "settings.save", entity: "settings", entityId: b.key });
  bustCatalog();
  return json({ ok: true });
});
