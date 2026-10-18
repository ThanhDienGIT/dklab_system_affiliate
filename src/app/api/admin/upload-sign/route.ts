import { randomUUID } from "node:crypto";
import { api, assertSameOrigin, json, requirePermissionApi } from "@/server/http";
import { AppError } from "@/server/domain/errors";
import { env } from "@/server/config/env";
import { cloudinarySignature } from "@/server/storage";
import { limit } from "@/server/security/rate-limit";

/**
 * Video khong qua server (Vercel gioi han body ~4.5MB): server chi ky tham so, trinh duyet upload thang len Cloudinary.
 * Chu ky chi gom folder + public_id + timestamp nen khong the dung de upload sang folder khac.
 */
export const POST = api(async (req: Request) => {
  assertSameOrigin(req);
  const u = await requirePermissionApi("product.write");
  if (!(await limit(`upload-sign:${u.id}`, 20, 10 * 60_000)).ok) throw new AppError("RATE_LIMITED", "Thao tác quá nhanh");
  const e = env();
  if (e.UPLOAD_DRIVER !== "cloudinary" || !e.CLOUDINARY_CLOUD_NAME || !e.CLOUDINARY_API_KEY || !e.CLOUDINARY_API_SECRET) {
    throw new AppError("VALIDATION", "Cần UPLOAD_DRIVER=cloudinary và đủ khoá Cloudinary để tải video. Hoặc dán link video.");
  }
  const signed = { folder: `${e.CLOUDINARY_FOLDER}/videos`, public_id: randomUUID(), timestamp: String(Math.floor(Date.now() / 1000)) };
  return json({
    uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(e.CLOUDINARY_CLOUD_NAME)}/video/upload`,
    apiKey: e.CLOUDINARY_API_KEY, signature: cloudinarySignature(signed, e.CLOUDINARY_API_SECRET), ...signed,
  });
});
