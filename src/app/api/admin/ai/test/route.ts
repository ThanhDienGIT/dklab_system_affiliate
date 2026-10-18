import { z } from "zod";
import { api, assertSameOrigin, json, readJson, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { limit } from "@/server/security/rate-limit";
import { AppError } from "@/server/domain/errors";

/** Goi thu model that (1 cau ngan) - ton rat it token, gioi han tan suat de tranh bi dot quota. */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("settings.write");
  if (!(await limit(`ai-test:${u.id}`, 15, 10 * 60_000)).ok) throw new AppError("RATE_LIMITED", "Thử quá nhiều lần, đợi vài phút");
  const b = z.object({ model: z.string().trim().min(2).max(90) }).parse(await readJson(req));
  return json(await getContainer().aiConfig.test(b.model));
});
