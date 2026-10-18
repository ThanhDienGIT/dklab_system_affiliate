import { api, assertSameOrigin, json, readJson, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";

export const PATCH = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const actor = await requirePermissionApi("user.manage");
  const b = (await readJson(req)) as { role?: string; status?: string };
  if (!["customer", "editor", "admin"].includes(b.role ?? "") || !["active", "blocked"].includes(b.status ?? "")) {
    throw new AppError("VALIDATION", "Vai trò hoặc trạng thái không hợp lệ");
  }
  await getContainer().profile.setRole(actor, (await ctx.params).id, b.role as "customer" | "editor" | "admin", b.status as "active" | "blocked");
  return json({ ok: true });
});
