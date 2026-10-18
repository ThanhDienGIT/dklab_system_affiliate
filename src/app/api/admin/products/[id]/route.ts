import { api, assertSameOrigin, bustCatalog, json, readJson, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";

type Ctx = { params: Promise<{ id: string }> };
const idOf = async (ctx: Ctx) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) throw new AppError("NOT_FOUND", "Không tìm thấy sản phẩm");
  return id;
};

export const PUT = api(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  await getContainer().productAdmin.update(await idOf(ctx), await readJson(req), u.id);
  bustCatalog();
  return json({ ok: true });
});

export const PATCH = api(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  await requirePermissionApi("product.write");
  const b = (await readJson(req)) as { status?: string };
  if (!["draft", "published", "archived"].includes(b.status ?? "")) throw new AppError("VALIDATION", "Trạng thái không hợp lệ");
  await getContainer().productAdmin.setStatus(await idOf(ctx), b.status as "draft" | "published" | "archived");
  bustCatalog();
  return json({ ok: true });
});

export const DELETE = api(async (req: Request, ctx: Ctx) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  await getContainer().productAdmin.remove(await idOf(ctx), u.id);
  bustCatalog();
  return json({ ok: true });
});
