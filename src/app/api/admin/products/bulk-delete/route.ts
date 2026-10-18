import { z } from "zod";
import { api, assertSameOrigin, bustCatalog, json, readJson, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { getContainer } from "@/server/container";
import { tokenize } from "@/lib/text";
import { can } from "@/server/security/rbac";
import { verifyPassword } from "@/server/security/password";
import { limit, requestMeta } from "@/server/security/rate-limit";
import type { ProductFilter } from "@/server/domain/types";

const body = z.union([
  z.object({ ids: z.array(z.number().int().positive()).min(1).max(5000) }),
  z.object({
    all: z.literal(true),
    // phai go dung chu nay o client -> chan goi API nham/CSRF kieu "xoa het"
    confirm: z.literal("XOA"),
    /** mat khau cua chinh admin dang dang nhap: chong phien bi chiem / bam nham / CSRF */
    password: z.string().min(1).max(200),
    filter: z.object({
      q: z.string().max(100).optional(), status: z.enum(["draft", "published", "archived"]).optional(),
      pc: z.string().max(80).optional(), tl: z.string().max(80).optional(),
    }).default({}),
  }),
]);

/** Xoa cac san pham da chon, hoac moi san pham khop bo loc hien tai (khong loc = toan bo). Khong the hoan tac. */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  const parsed = body.safeParse(await readJson(req));
  if (!parsed.success) throw new AppError("VALIDATION", "Yêu cầu xoá không hợp lệ (hoặc chưa gõ XOA / nhập mật khẩu admin)");
  const svc = getContainer().productAdmin;
  let deleted: number;
  if ("ids" in parsed.data) deleted = await svc.removeMany({ ids: parsed.data.ids }, u.id);
  else {
    // Xoa hang loat theo bo loc / toan bo: chi ADMIN + nhap lai mat khau (editor chi duoc xoa tung lo da chon)
    if (!can(u.role, "user.manage")) throw new AppError("FORBIDDEN", "Chỉ quản trị viên (admin) được xoá tất cả sản phẩm");
    const { ipHash } = await requestMeta();
    const c = getContainer();
    if (u.lockedUntil && u.lockedUntil > new Date()) throw new AppError("LOCKED", "Tài khoản tạm khoá do nhập sai mật khẩu nhiều lần. Thử lại sau ít phút.");
    if (!u.passwordHash) throw new AppError("VALIDATION", "Tài khoản đăng nhập bằng Google chưa có mật khẩu. Hãy đặt mật khẩu ở trang Tài khoản trước.");
    if (!(await limit(`bulkdel:${u.id}`, 10, 15 * 60_000)).ok) throw new AppError("RATE_LIMITED", "Thao tác quá nhanh, thử lại sau");
    if (!(await verifyPassword(parsed.data.password, u.passwordHash))) {
      const fails = u.failedLogins + 1;
      await c.users.update(u.id, fails >= 5 ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) } : { failedLogins: fails });
      await c.misc.audit({ actorId: u.id, action: "product.bulk_delete_denied", entity: "product", meta: { reason: "wrong_password" }, ipHash });
      throw new AppError("UNAUTHORIZED", "Mật khẩu admin không đúng", { password: "Mật khẩu admin không đúng" });
    }
    if (u.failedLogins) await c.users.update(u.id, { failedLogins: 0 });
    const f = parsed.data.filter;
    const filter: ProductFilter = {
      includeAll: true, status: f.status, styleSlug: f.pc || undefined, categorySlug: f.tl || undefined,
      keywords: f.q?.trim() ? tokenize(f.q.trim()) : undefined,
    };
    deleted = await svc.removeMany({ filter }, u.id);
  }
  bustCatalog();
  return json({ deleted });
});
