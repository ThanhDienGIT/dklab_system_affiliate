import { z } from "zod";
import { api, assertSameOrigin, json, readJson, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { validation } from "@/server/services/auth.service";
import { AI_FEATURES, AI_FEATURE_IDS, MODEL_ID_RE } from "@/server/domain/ai";
import { limit } from "@/server/security/rate-limit";
import { AppError } from "@/server/domain/errors";

const model = z.string().trim().regex(MODEL_ID_RE, "Tên model không hợp lệ");
const body = z.object({
  apiKey: z.union([z.string().trim().max(300), z.null()]).optional(), // "" / undefined = giu nguyen, null = xoa key trong DB
  skipCheck: z.boolean().optional(), // luu key khi khong goi duoc Gemini (mang chan...)
  defaultModel: model.nullable(),
  features: z.record(z.string(), z.object({ model: model.or(z.literal("")), enabled: z.boolean() })),
});

/** Luon kiem tra key + lay danh sach model truc tiep tu Gemini moi lan admin mo trang. Khong bao gio tra key ve client. */
export const GET = api(async () => {
  await requirePermissionApi("settings.write");
  const ai = getContainer().aiConfig;
  const [check, current] = await Promise.all([ai.check(true), ai.current()]);
  return json({ check, current, features: AI_FEATURES });
});

export const PUT = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("settings.write");
  if (!(await limit(`ai-cfg:${u.id}`, 20, 15 * 60_000)).ok) throw new AppError("RATE_LIMITED", "Thao tác quá nhanh, thử lại sau");
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw validation(parsed.error.issues);
  const b = parsed.data;
  const features: Record<string, { model: string; enabled: boolean }> = {};
  for (const id of AI_FEATURE_IDS) {
    const f = b.features[id];
    if (!f) continue;
    if (f.enabled && !f.model) throw new AppError("VALIDATION", `Chức năng "${id}" đang bật nhưng chưa chọn model`);
    features[id] = f.model ? f : { model: "unset", enabled: false };
  }
  const ai = getContainer().aiConfig;
  const check = await ai.save({
    apiKey: b.apiKey === undefined || b.apiKey === "" ? undefined : b.apiKey,
    defaultModel: b.defaultModel, features, actorId: u.id, skipCheck: b.skipCheck === true,
  });
  await getContainer().misc.audit({
    actorId: u.id, action: "ai.config.save", entity: "ai", entityId: "gemini",
    meta: { skipCheck: b.skipCheck === true, keyChanged: b.apiKey !== undefined && b.apiKey !== "", defaultModel: b.defaultModel, features },
  });
  return json({ ok: true, check, current: await ai.current() });
});
