import { api, assertSameOrigin, json, requireApiUser } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { can } from "@/server/security/rbac";
import { enforceRate } from "@/server/security/rate-limit";
import { AVATAR_SPEC, BANNER_SPEC, PRODUCT_SPEC, saveImage } from "@/server/storage";
import { getContainer } from "@/server/container";

export const runtime = "nodejs";

/** kind=avatar: moi nguoi dung tu doi anh dai dien. kind=product|banner: chi nhan vien (product.write). */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  await enforceRate("upload", 30, 10 * 60_000);
  const u = await requireApiUser();
  const form = await req.formData();
  const file = form.get("file");
  const kind = String(form.get("kind") ?? "");
  if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Chưa chọn ảnh");
  if (kind === "avatar") {
    const url = await saveImage(file, "avatars", AVATAR_SPEC);
    await getContainer().profile.setAvatar(u.id, url);
    return json({ url });
  }
  if (kind === "product" || kind === "banner") {
    if (!can(u.role, "product.write")) throw new AppError("FORBIDDEN", "Bạn không có quyền tải ảnh sản phẩm");
    return json({ url: await saveImage(file, kind === "product" ? "products" : "banners", kind === "product" ? PRODUCT_SPEC : BANNER_SPEC) });
  }
  throw new AppError("VALIDATION", "Loại ảnh không hợp lệ");
});
