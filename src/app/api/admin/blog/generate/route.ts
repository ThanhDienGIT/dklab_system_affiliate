import { z } from "zod";
import { api, assertSameOrigin, json, readJson, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { AppError } from "@/server/domain/errors";
import { limit } from "@/server/security/rate-limit";
import { validation } from "@/server/services/auth.service";
import { assertPublicUrl } from "@/server/services/blog/safe-fetch";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({
  productId: z.number().int().positive(),
  mode: z.enum(["db", "web", "both"]),
  extraUrls: z.array(z.string().trim().url().max(500)).max(3).default([]),
});

/** Tao BAI NHAP bang AI tu san pham (khong tu xuat ban). Ton quota Gemini + Search API nen gioi han tan suat. */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  if (!(await limit(`blog-gen:${u.id}`, 6, 10 * 60_000)).ok) throw new AppError("RATE_LIMITED", "Tạo blog quá nhanh, đợi vài phút (tiết kiệm quota AI)");
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw validation(parsed.error.issues);
  for (const x of parsed.data.extraUrls) await assertPublicUrl(x);
  const r = await getContainer().blog.generate({ ...parsed.data, authorId: u.id });
  await getContainer().misc.audit({ actorId: u.id, action: "blog.generate", entity: "blog", entityId: String(r.id), meta: { productId: parsed.data.productId, mode: parsed.data.mode } });
  return json({ ok: true, ...r });
});
