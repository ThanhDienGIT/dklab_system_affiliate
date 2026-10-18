import { z } from "zod";
import { revalidatePath } from "next/cache";
import { api, assertSameOrigin, json, readJson, requirePermissionApi } from "@/server/http";
import { getContainer } from "@/server/container";
import { AppError } from "@/server/domain/errors";
import { validation } from "@/server/services/auth.service";

const img = z.string().trim().max(2000).refine((v) => /^(https?:\/\/|\/)/.test(v), "Link ảnh không hợp lệ");
const patch = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  slug: z.string().trim().min(1).max(96).optional(),
  excerpt: z.string().trim().max(300).optional(),
  content: z.string().max(60_000).optional(),
  coverUrl: z.union([img, z.literal(""), z.null()]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  productIds: z.array(z.number().int().positive()).max(30).optional(),
});
const idOf = async (ctx: { params: Promise<{ id: string }> }) => {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new AppError("NOT_FOUND", "Không tìm thấy bài viết");
  return id;
};

export const PATCH = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  const id = await idOf(ctx);
  const parsed = patch.safeParse(await readJson(req));
  if (!parsed.success) throw validation(parsed.error.issues);
  const { coverUrl, ...rest } = parsed.data;
  const c = getContainer();
  await c.blog.update(id, { ...rest, ...(coverUrl !== undefined ? { coverUrl: coverUrl || null } : {}) });
  await c.misc.audit({ actorId: u.id, action: "blog.update", entity: "blog", entityId: String(id), meta: { status: parsed.data.status ?? null } });
  revalidatePath("/blog"); revalidatePath("/blog/[slug]", "page");
  return json({ ok: true });
});

export const DELETE = api(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  const id = await idOf(ctx);
  await getContainer().blogRepo.remove(id);
  await getContainer().misc.audit({ actorId: u.id, action: "blog.delete", entity: "blog", entityId: String(id) });
  revalidatePath("/blog");
  return json({ ok: true });
});
