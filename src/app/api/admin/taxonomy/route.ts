import { api, assertSameOrigin, bustCatalog, json, readJson, requirePermissionApi } from "@/server/http";
import { AppError, isAppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";
import { categoryInputSchema, styleInputSchema, typeInputSchema } from "@/server/domain/validators";
import { validation } from "@/server/services/auth.service";

type Kind = "style" | "category" | "type";
const SCHEMAS = { style: styleInputSchema, category: categoryInputSchema, type: typeInputSchema } as const;

/** Luu (them/sua) phong cach, the loai hoac loai cu the */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("taxonomy.write");
  const b = (await readJson(req)) as { kind?: Kind; id?: number | null; data?: unknown };
  if (!b.kind || !(b.kind in SCHEMAS)) throw new AppError("VALIDATION", "Loại dữ liệu không hợp lệ");
  const parsed = SCHEMAS[b.kind].safeParse(b.data);
  if (!parsed.success) throw validation(parsed.error.issues);
  const repo = getContainer().taxonomy;
  const id = b.id ?? null;
  let saved: number;
  try {
    if (b.kind === "style") saved = await repo.saveStyle(id, parsed.data as never);
    else if (b.kind === "category") saved = await repo.saveCategory(id, parsed.data as never);
    else saved = await repo.saveType(id, parsed.data as never);
  } catch (e) {
    if (String((e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code) === "23505") throw new AppError("CONFLICT", "Slug đã tồn tại", { slug: "Slug đã tồn tại" });
    throw e;
  }
  await getContainer().misc.audit({ actorId: u.id, action: `taxonomy.${b.kind}.save`, entity: b.kind, entityId: String(saved) });
  bustCatalog();
  return json({ id: saved });
});

export const DELETE = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("taxonomy.write");
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") as Kind | null, id = Number(sp.get("id"));
  if (!kind || !Number.isInteger(id)) throw new AppError("VALIDATION", "Thiếu tham số");
  const repo = getContainer().taxonomy;
  try {
    if (kind === "style") await repo.deleteStyle(id);
    else if (kind === "category") await repo.deleteCategory(id);
    else if (kind === "type") await repo.deleteType(id);
    else throw new AppError("VALIDATION", "Loại dữ liệu không hợp lệ");
  } catch (e) {
    if (isAppError(e)) throw e;
    throw new AppError("CONFLICT", "Đang có sản phẩm thuộc mục này, hãy chuyển hoặc xoá sản phẩm trước");
  }
  await getContainer().misc.audit({ actorId: u.id, action: `taxonomy.${kind}.delete`, entity: kind, entityId: String(id) });
  bustCatalog();
  return json({ ok: true });
});
